import crypto from "node:crypto";
import config from "../config.ts";
import { postgres } from "./postgres.ts";

const INVITE_TTL_MS = 8 * 60 * 60 * 1000;

type RoomInviteCredentialPayload = {
  roomId: string;
  inviteId: string;
  iat: number;
  exp: number;
};

function getInviteSecret(): string {
  const secret = String(config.INVITE_CREDENTIAL_SECRET || "").trim();
  if (!secret) throw new Error("INVITE_CREDENTIAL_SECRET is required");
  return secret;
}

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function signCredentialPayload(payload: RoomInviteCredentialPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getInviteSecret())
    .update(encodedPayload, "utf8")
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function generateRoomInviteCredential(roomId: string, inviteId: string): string {
  const now = Date.now();
  return signCredentialPayload({ roomId, inviteId, iat: now, exp: now + INVITE_TTL_MS });
}

function decodeAndVerifyCredential(
  roomId: string,
  credential: string,
): RoomInviteCredentialPayload | null {
  try {
    const [encodedPayload, signature] = credential.split(".");
    if (!encodedPayload || !signature) return null;
    const expectedSignature = crypto.createHmac("sha256", getInviteSecret()).update(encodedPayload, "utf8").digest("base64url");
    const actual = Buffer.from(signature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as RoomInviteCredentialPayload;
    if (
      payload.roomId !== roomId ||
      typeof payload.inviteId !== "string" ||
      !payload.inviteId ||
      !Number.isFinite(payload.iat) ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Date.now() ||
      payload.iat > Date.now() + 60_000
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function validateRoomInviteCredential(
  roomId: string,
  credential: string,
): Promise<{ valid: boolean; inviteId?: string }> {
  const payload = decodeAndVerifyCredential(roomId, credential);
  if (!payload || !postgres) return { valid: false };
  try {
    const result = await postgres.query(
      `SELECT revoked_at, expires_at FROM room_invites WHERE id = $1 AND room_id = $2`,
      [payload.inviteId, roomId],
    );
    const invite = result.rows[0];
    if (!invite || invite.revoked_at) return { valid: false };
    if (new Date(invite.expires_at).getTime() <= Date.now()) return { valid: false };
    return { valid: true, inviteId: payload.inviteId };
  } catch {
    return { valid: false };
  }
}

export async function createRoomInvite(roomId: string, uid: string, expiresInHours = 24): Promise<{ inviteToken: string; expiresAt: Date; inviteId: string }> {
  if (!postgres) throw new Error("Database unavailable");
  if (!Number.isFinite(expiresInHours) || expiresInHours <= 0 || expiresInHours > 24) throw new Error("Invalid invite expiration");
  const roomResult = await postgres.query(
    `SELECT "roomId", owner_id, status, "isPermanent", "expiresAt" FROM rooms WHERE "roomId" = $1`,
    [roomId],
  );
  const room = roomResult.rows[0];
  if (!room) throw new Error("Room not found");
  if (room.owner_id !== uid) throw new Error("Forbidden");
  if (["expired", "ended"].includes(room.status)) throw new Error("Room is not joinable");
  if (!room.isPermanent && room.expiresAt && new Date(room.expiresAt).getTime() <= Date.now()) throw new Error("Room is expired");
  const inviteToken = generateInviteToken();
  const tokenHash = hashInviteToken(inviteToken);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  const result = await postgres.query(
    `INSERT INTO room_invites (room_id, token_hash, created_by, expires_at) VALUES ($1, $2, $3, $4) RETURNING id`,
    [roomId, tokenHash, uid, expiresAt],
  );
  return { inviteToken, expiresAt, inviteId: result.rows[0].id as string };
}

export async function redeemRoomInvite(roomId: string, token: string): Promise<{ inviteCredential: string; expiresAt: Date }> {
  if (!postgres) throw new Error("Database unavailable");
  if (!token || token.length > 256) throw new Error("Invalid invite");
  const tokenHash = hashInviteToken(token);
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const inviteResult = await client.query(
      `SELECT id, expires_at, revoked_at, max_uses, uses FROM room_invites WHERE room_id = $1 AND token_hash = $2 FOR UPDATE`,
      [roomId, tokenHash],
    );
    const invite = inviteResult.rows[0];
    if (!invite) throw new Error("Invalid invite");
    if (invite.revoked_at) throw new Error("Invite revoked");
    if (new Date(invite.expires_at).getTime() <= Date.now()) throw new Error("Invite expired");
    if (invite.max_uses !== null && Number(invite.uses) >= Number(invite.max_uses)) throw new Error("Invite usage limit reached");
    const roomResult = await client.query(`SELECT status, "isPermanent", "expiresAt" FROM rooms WHERE "roomId" = $1`, [roomId]);
    const room = roomResult.rows[0];
    if (!room) throw new Error("Room not found");
    if (["expired", "ended"].includes(room.status)) throw new Error("Room is not joinable");
    if (!room.isPermanent && room.expiresAt && new Date(room.expiresAt).getTime() <= Date.now()) throw new Error("Room is expired");
    await client.query(`UPDATE room_invites SET uses = uses + 1, used_at = COALESCE(used_at, NOW()) WHERE id = $1`, [invite.id]);
    const inviteCredential = generateRoomInviteCredential(roomId, invite.id);
    await client.query("COMMIT");
    return { inviteCredential, expiresAt: new Date(invite.expires_at) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeRoomInvite(roomId: string, inviteId: string, uid: string): Promise<void> {
  if (!postgres) throw new Error("Database unavailable");
  const result = await postgres.query(
    `UPDATE room_invites ri SET revoked_at = NOW() FROM rooms r WHERE ri.id = $1 AND ri.room_id = $2 AND r."roomId" = ri.room_id AND r.owner_id = $3 AND ri.revoked_at IS NULL`,
    [inviteId, roomId, uid],
  );
  if (result.rowCount !== 1) throw new Error("Invite not found or forbidden");
}
