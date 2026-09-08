import { postgres } from "./utils/postgres.ts";
import type { Server } from "socket.io";
import type { Room } from "./room.ts";

let ioInstance: Server | null = null;
let roomsMap: Map<string, Room> | null = null;

export function initRoomLifecycle(io: Server, rooms: Map<string, Room>) {
  ioInstance = io;
  roomsMap = rooms;
}

export interface StartRoomResult {
  success: boolean;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  isPermanent: boolean;
  durationMinutes: number | null;
  serverNow: number;
}

/**
 * Authoritative, single server-side state transition for starting a watch party room.
 * Owned responsibilities:
 * - Owner authorization
 * - State validation (cannot start expired/ended rooms)
 * - Idempotency (if already active, returns active state without resetting timestamps)
 * - Concurrency guard (atomic database transition WHERE status = 'waiting')
 * - startedAt and expiresAt computation (client never calculates expiresAt)
 * - Permanent rooms receive expiresAt = null, durationMinutes = null
 * - Database persistence
 * - Lifecycle audit event logging
 * - In-memory room instance update
 * - Real-time socket broadcast to connected participants
 */
export async function startRoomLifecycle(roomId: string, uid: string): Promise<StartRoomResult> {
  if (!postgres) {
    throw new Error("Database is not configured.");
  }

  const cleanRoomId = roomId.trim();
  const normalizedId = cleanRoomId.startsWith("/") ? cleanRoomId.substring(1) : cleanRoomId;
  const slashedId = `/${normalizedId}`;

  // 1. Fetch current room state from database
  const roomRes = await postgres.query(
    `SELECT "roomId", owner_id, status, "startedAt", "expiresAt", "isPermanent", "durationMinutes", "roomTitle"
     FROM rooms
     WHERE "roomId" = $1 OR "roomId" = $2`,
    [normalizedId, slashedId]
  );

  if (!roomRes || roomRes.rowCount === 0) {
    throw new Error("Room not found.");
  }

  const room = roomRes.rows[0];
  const targetRoomId = room.roomId;

  // 2. Authorization check
  if (room.owner_id !== uid) {
    throw new Error("Only the room owner can start the watch party.");
  }

  const now = new Date();
  const serverNow = now.getTime();

  // 3. Idempotency check: If already active, return existing active state without resetting timer
  if (room.status === "active") {
    return {
      success: true,
      status: "active",
      startedAt: room.startedAt ? new Date(room.startedAt).toISOString() : now.toISOString(),
      expiresAt: room.expiresAt ? new Date(room.expiresAt).toISOString() : null,
      isPermanent: Boolean(room.isPermanent),
      durationMinutes: room.durationMinutes ?? null,
      serverNow,
    };
  }

  // 4. State validation: Reject if ended or expired
  if (room.status === "expired" || room.status === "ended") {
    throw new Error(`Cannot start a room that is ${room.status}.`);
  }

  if (room.status !== "waiting") {
    throw new Error(`Cannot start a room with status '${room.status}'.`);
  }

  // 5. Compute timestamps on the server
  const isPermanent = Boolean(room.isPermanent);
  let expiresAt: Date | null = null;

  if (!isPermanent) {
    const duration = Number(room.durationMinutes) || 180;
    expiresAt = new Date(serverNow + duration * 60 * 1000);
  }

  // 6. Concurrency guard: Atomic database update
  const updateRes = await postgres.query(
    `UPDATE rooms
     SET
       status = 'active',
       "startedAt" = $1,
       "expiresAt" = $2,
       "lastUpdateTime" = $1,
       "lastActiveAt" = $1
     WHERE "roomId" = $3 AND owner_id = $4 AND status = 'waiting'
     RETURNING *`,
    [now, expiresAt, targetRoomId, uid]
  );

  if (updateRes.rowCount === 0) {
    // Another request may have transitioned the room concurrently. Check if active.
    const recheckRes = await postgres.query(
      `SELECT status, "startedAt", "expiresAt", "isPermanent", "durationMinutes"
       FROM rooms WHERE "roomId" = $1`,
      [targetRoomId]
    );
    const recheck = recheckRes.rows[0];
    if (recheck && recheck.status === "active") {
      return {
        success: true,
        status: "active",
        startedAt: new Date(recheck.startedAt).toISOString(),
        expiresAt: recheck.expiresAt ? new Date(recheck.expiresAt).toISOString() : null,
        isPermanent: Boolean(recheck.isPermanent),
        durationMinutes: recheck.durationMinutes ?? null,
        serverNow: Date.now(),
      };
    }
    throw new Error("Failed to transition room to active state.");
  }

  // 7. Audit log in room_lifecycle_events
  try {
    await postgres.query(
      `INSERT INTO room_lifecycle_events
       ("roomId", actor, event, "previousStatus", "newStatus", "previousExpiresAt", "newExpiresAt", reason, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        targetRoomId,
        uid,
        "room.started",
        "waiting",
        "active",
        null,
        expiresAt,
        "host started watch party",
        now,
      ]
    );
  } catch (auditErr) {
    console.warn("Failed to write room.started audit event:", auditErr);
  }

  // 8. In-memory Room instance update
  const memoryRoom = roomsMap?.get(targetRoomId) || roomsMap?.get(normalizedId) || roomsMap?.get(slashedId);
  if (memoryRoom) {
    memoryRoom.status = "active";
    memoryRoom.startedAt = now;
    memoryRoom.expiresAt = expiresAt ? expiresAt : undefined;
    memoryRoom.isPermanent = isPermanent;
    memoryRoom.durationMinutes = isPermanent ? null : (room.durationMinutes ?? 180);
    memoryRoom.lastUpdateTime = now;
  }

  // 9. Authoritative broadcast to all connected clients
  const broadcastPayload = {
    status: "active",
    startedAt: now.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    isPermanent,
    durationMinutes: isPermanent ? null : (room.durationMinutes ?? 180),
    serverNow: Date.now(),
  };

  if (ioInstance) {
    const nspPrimary = ioInstance.of(targetRoomId);
    nspPrimary.emit("REC:roomStarted", broadcastPayload);
    nspPrimary.emit("REC:getRoomState", {
      owner: room.owner_id,
      ...broadcastPayload,
    });

    if (normalizedId !== targetRoomId) {
      const nspNorm = ioInstance.of(normalizedId);
      nspNorm.emit("REC:roomStarted", broadcastPayload);
      nspNorm.emit("REC:getRoomState", {
        owner: room.owner_id,
        ...broadcastPayload,
      });
    }
  }

  return {
    success: true,
    status: "active",
    startedAt: now.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    isPermanent,
    durationMinutes: isPermanent ? null : (room.durationMinutes ?? 180),
    serverNow: Date.now(),
  };
}
