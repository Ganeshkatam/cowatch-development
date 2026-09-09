import { postgres } from "./utils/postgres.ts";
import type { Server } from "socket.io";
import type { Room } from "./room.ts";

let ioInstance: Server | null = null;
let roomsMap: Map<string, Room> | null = null;

export function initRoomLifecycle(io: Server, rooms: Map<string, Room>) {
  ioInstance = io;
  roomsMap = rooms;
}

export const ALLOWED_DURATION_PRESETS = [
  30, 60, 120, 180, 300, 360, 720, 1440,
] as const;
export type AllowedDurationPreset = (typeof ALLOWED_DURATION_PRESETS)[number];

export function validateTemporaryDuration(val: unknown): number {
  const num = typeof val === "number" ? val : Number(val);
  if (
    !Number.isInteger(num) ||
    !ALLOWED_DURATION_PRESETS.includes(num as any)
  ) {
    throw new Error(
      `Invalid session duration (${val}). Allowed presets are: ${ALLOWED_DURATION_PRESETS.join(", ")} minutes.`,
    );
  }
  return num;
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
export async function startRoomLifecycle(
  roomId: string,
  uid: string | "SYSTEM",
): Promise<StartRoomResult> {
  if (!postgres) {
    throw new Error("Database is not configured.");
  }

  const cleanRoomId = roomId.trim();
  const normalizedId = cleanRoomId.startsWith("/")
    ? cleanRoomId.substring(1)
    : cleanRoomId;
  const slashedId = `/${normalizedId}`;

  // 1. Fetch current room state from database
  const roomRes = await postgres.query(
    `SELECT "roomId", owner_id, status, "startedAt", "expiresAt", "isPermanent", "durationMinutes", "roomTitle"
     FROM rooms
     WHERE "roomId" = $1 OR "roomId" = $2`,
    [normalizedId, slashedId],
  );

  if (!roomRes || roomRes.rowCount === 0) {
    throw new Error("Room not found.");
  }

  const room = roomRes.rows[0];
  const targetRoomId = room.roomId;

  // 2. Authorization check (skip for system worker)
  if (uid !== "SYSTEM" && room.owner_id !== uid) {
    throw new Error("Only the room owner can start the watch party.");
  }

  const now = new Date();
  const serverNow = now.getTime();

  // 3. Idempotency check: If already active, return existing active state without resetting timer
  if (room.status === "active") {
    return {
      success: true,
      status: "active",
      startedAt: room.startedAt
        ? new Date(room.startedAt).toISOString()
        : now.toISOString(),
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

  if (room.status !== "waiting" && room.status !== "scheduled") {
    throw new Error(`Cannot start a room with status '${room.status}'.`);
  }

  // 5. Compute timestamps on the server
  const isPermanent = Boolean(room.isPermanent);
  let expiresAt: Date | null = null;
  const validatedDuration = isPermanent
    ? null
    : validateTemporaryDuration(room.durationMinutes);

  if (!isPermanent && validatedDuration !== null) {
    expiresAt = new Date(serverNow + validatedDuration * 60 * 1000);
  }

  // 6. Concurrency guard: Atomic database update
  const isSystem = uid === "SYSTEM";
  const updateRes = isSystem
    ? await postgres.query(
        `UPDATE rooms
         SET
           status = 'active',
           "startedAt" = $1,
           "expiresAt" = $2,
           "lastUpdateTime" = $1,
           "lastActiveAt" = $1
         WHERE "roomId" = $3 AND (status = 'waiting' OR status = 'scheduled')
         RETURNING *`,
        [now, expiresAt, targetRoomId],
      )
    : await postgres.query(
        `UPDATE rooms
         SET
           status = 'active',
           "startedAt" = $1,
           "expiresAt" = $2,
           "lastUpdateTime" = $1,
           "lastActiveAt" = $1
         WHERE "roomId" = $3 AND (status = 'waiting' OR status = 'scheduled') AND owner_id = $4
         RETURNING *`,
        [now, expiresAt, targetRoomId, uid],
      );

  if (updateRes.rowCount === 0) {
    // Another request may have transitioned the room concurrently. Check if active.
    const recheckRes = await postgres.query(
      `SELECT status, "startedAt", "expiresAt", "isPermanent", "durationMinutes"
       FROM rooms WHERE "roomId" = $1`,
      [targetRoomId],
    );
    const recheck = recheckRes.rows[0];
    if (recheck && recheck.status === "active") {
      return {
        success: true,
        status: "active",
        startedAt: new Date(recheck.startedAt).toISOString(),
        expiresAt: recheck.expiresAt
          ? new Date(recheck.expiresAt).toISOString()
          : null,
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
        room.status,
        "active",
        null,
        expiresAt,
        uid === "SYSTEM"
          ? "scheduled start time reached"
          : "host started watch party",
        now,
      ],
    );
  } catch (auditErr) {
    console.warn("Failed to write room.started audit event:", auditErr);
  }

  // 8. In-memory Room instance update
  const memoryRoom =
    roomsMap?.get(targetRoomId) ||
    roomsMap?.get(normalizedId) ||
    roomsMap?.get(slashedId);
  if (memoryRoom) {
    memoryRoom.status = "active";
    memoryRoom.startedAt = now;
    memoryRoom.expiresAt = expiresAt ? expiresAt : undefined;
    memoryRoom.isPermanent = isPermanent;
    memoryRoom.durationMinutes = validatedDuration;
    memoryRoom.lastUpdateTime = now;
  }

  // 9. Authoritative broadcast to all connected clients
  const broadcastPayload = {
    status: "active",
    startedAt: now.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    isPermanent,
    durationMinutes: validatedDuration,
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
    durationMinutes: validatedDuration,
    serverNow: Date.now(),
  };
}

export async function cancelRoomLifecycle(roomId: string, uid: string) {
  if (!postgres) throw new Error("Database is not configured.");
  const cleanRoomId = roomId.trim();
  const normalizedId = cleanRoomId.startsWith("/")
    ? cleanRoomId.substring(1)
    : cleanRoomId;
  const slashedId = `/${normalizedId}`;

  const roomRes = await postgres.query(
    `SELECT "roomId", owner_id, status FROM rooms WHERE "roomId" = $1 OR "roomId" = $2`,
    [normalizedId, slashedId],
  );
  if (!roomRes || roomRes.rowCount === 0) throw new Error("Room not found.");
  const room = roomRes.rows[0];
  const targetRoomId = room.roomId;

  if (room.owner_id !== uid)
    throw new Error("Only the room owner can cancel the watch party.");
  if (room.status !== "scheduled")
    throw new Error(
      `Cannot cancel a room that is ${room.status}. Only scheduled rooms can be cancelled.`,
    );

  const now = new Date();
  const updateRes = await postgres.query(
    `UPDATE rooms SET status = 'cancelled', "cancelledAt" = $1, "lastUpdateTime" = $1 WHERE "roomId" = $2 AND owner_id = $3 AND status = 'scheduled' RETURNING *`,
    [now, targetRoomId, uid],
  );
  if (updateRes.rowCount === 0)
    throw new Error("Failed to transition room to cancelled state.");

  try {
    await postgres.query(
      `INSERT INTO room_lifecycle_events
       ("roomId", actor, event, "previousStatus", "newStatus", "previousExpiresAt", "newExpiresAt", reason, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        targetRoomId,
        uid,
        "room.cancelled",
        room.status,
        "cancelled",
        null,
        null,
        "host cancelled scheduled watch party",
        now,
      ],
    );
  } catch (auditErr) {
    console.warn("Failed to write room.cancelled audit event:", auditErr);
  }

  const memoryRoom =
    roomsMap?.get(targetRoomId) ||
    roomsMap?.get(normalizedId) ||
    roomsMap?.get(slashedId);
  if (memoryRoom) {
    memoryRoom.status = "cancelled";
    memoryRoom.lastUpdateTime = now;
  }
  if (ioInstance) {
    const broadcastPayload = {
      status: "cancelled",
      cancelledAt: now.toISOString(),
      serverNow: Date.now(),
    };
    ioInstance.of(targetRoomId).emit("REC:roomCancelled", broadcastPayload);
    if (normalizedId !== targetRoomId)
      ioInstance.of(normalizedId).emit("REC:roomCancelled", broadcastPayload);
  }
  return { success: true, status: "cancelled", cancelledAt: now.toISOString() };
}

export async function rescheduleRoomLifecycle(
  roomId: string,
  uid: string,
  newTimestamp: string,
) {
  if (!postgres) throw new Error("Database is not configured.");
  const parsedDate = new Date(newTimestamp);
  if (isNaN(parsedDate.getTime()))
    throw new Error("Invalid scheduledStartsAt timestamp");
  if (parsedDate.getTime() <= Date.now())
    throw new Error("Scheduled start must be in the future");

  const cleanRoomId = roomId.trim();
  const normalizedId = cleanRoomId.startsWith("/")
    ? cleanRoomId.substring(1)
    : cleanRoomId;
  const slashedId = `/${normalizedId}`;

  const roomRes = await postgres.query(
    `SELECT "roomId", owner_id, status FROM rooms WHERE "roomId" = $1 OR "roomId" = $2`,
    [normalizedId, slashedId],
  );
  if (!roomRes || roomRes.rowCount === 0) throw new Error("Room not found.");
  const room = roomRes.rows[0];
  const targetRoomId = room.roomId;

  if (room.owner_id !== uid)
    throw new Error("Only the room owner can reschedule the watch party.");
  if (room.status !== "scheduled")
    throw new Error(`Cannot reschedule a room that is ${room.status}.`);

  const updateRes = await postgres.query(
    `UPDATE rooms SET "scheduledStartsAt" = $1, "lastUpdateTime" = NOW() WHERE "roomId" = $2 AND owner_id = $3 AND status = 'scheduled' RETURNING *`,
    [parsedDate, targetRoomId, uid],
  );
  if (updateRes.rowCount === 0) throw new Error("Failed to reschedule room.");

  const memoryRoom =
    roomsMap?.get(targetRoomId) ||
    roomsMap?.get(normalizedId) ||
    roomsMap?.get(slashedId);
  if (memoryRoom) {
    memoryRoom.scheduledStartsAt = parsedDate;
    memoryRoom.lastUpdateTime = new Date();
  }
  if (ioInstance) {
    const broadcastPayload = {
      scheduledStartsAt: parsedDate.toISOString(),
      serverNow: Date.now(),
    };
    ioInstance.of(targetRoomId).emit("REC:roomRescheduled", broadcastPayload);
    if (normalizedId !== targetRoomId)
      ioInstance.of(normalizedId).emit("REC:roomRescheduled", broadcastPayload);
  }
  return { success: true, scheduledStartsAt: parsedDate.toISOString() };
}

export async function activateDueScheduledRooms() {
  if (!postgres) return;
  try {
    const dueRoomsRes = await postgres.query(`
      SELECT "roomId" FROM rooms WHERE status = 'scheduled' AND "scheduledStartsAt" <= NOW()
    `);
    for (const row of dueRoomsRes.rows) {
      try {
        await startRoomLifecycle(row.roomId, "SYSTEM");
        console.log(`[RoomScheduler] Activated scheduled room ${row.roomId}`);
      } catch (err) {
        console.error(
          `[RoomScheduler] Failed to activate scheduled room ${row.roomId}:`,
          err,
        );
      }
    }
  } catch (err) {
    console.error("[RoomScheduler] Failed to query due scheduled rooms:", err);
  }
}
