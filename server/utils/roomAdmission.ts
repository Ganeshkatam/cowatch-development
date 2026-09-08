import crypto from "crypto";
import { redis } from "./redis.ts";

export interface AdmissionRecord {
  roomId: string;
  userId: string | null;
  issuedAt: number;
}

const ADMISSION_TTL = 3600; // 1 hour
const RATE_LIMIT_WINDOW = 900; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;

/**
 * Generates a cryptographically secure random token and stores it in Redis.
 */
export async function createAdmissionToken(roomId: string, userId: string | null): Promise<string | null> {
  if (!redis) {
    // If Redis is not available, we can't properly store admission tokens.
    // We could fallback to in-memory, but Redis is required for production.
    console.warn("Redis is not configured, returning fallback token.");
    return `fallback_${crypto.randomBytes(16).toString("hex")}`;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const key = `admission:${roomId}:${token}`;
  
  const record: AdmissionRecord = {
    roomId,
    userId,
    issuedAt: Date.now(),
  };

  await redis.setex(key, ADMISSION_TTL, JSON.stringify(record));
  return token;
}

/**
 * Retrieves and validates an admission token from Redis.
 */
export async function getAdmissionRecord(roomId: string, token: string): Promise<AdmissionRecord | null> {
  if (!redis) {
    if (token.startsWith("fallback_")) {
      return { roomId, userId: null, issuedAt: Date.now() };
    }
    return null;
  }

  const key = `admission:${roomId}:${token}`;
  const data = await redis.get(key);
  if (!data) return null;

  try {
    return JSON.parse(data) as AdmissionRecord;
  } catch (e) {
    return null;
  }
}

/**
 * Revokes an admission token.
 */
export async function revokeAdmissionToken(roomId: string, token: string): Promise<void> {
  if (redis) {
    await redis.del(`admission:${roomId}:${token}`);
  }
}

/**
 * Rate limits passcode attempts using two dimensions: IP and User ID (if available).
 * Returns true if the attempt is allowed, false if rate limited.
 */
export async function checkRateLimit(roomId: string, ip: string, userId: string | null): Promise<boolean> {
  if (!redis) return true;

  const multi = redis.multi();
  
  const ipKey = `room-admission:ip:${roomId}:${ip}`;
  multi.incr(ipKey);
  // Only set expiration if not exists. Redis >= 6.2 has EXPIRE with NX
  multi.expire(ipKey, RATE_LIMIT_WINDOW, "NX" as any); 

  if (userId) {
    const userKey = `room-admission:user:${roomId}:${userId}`;
    multi.incr(userKey);
    multi.expire(userKey, RATE_LIMIT_WINDOW, "NX" as any);
  }

  const results = await multi.exec();
  if (!results) return true; // Fail open if Redis error

  const ipAttempts = results[0][1] as number;
  if (ipAttempts > RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  if (userId && results.length >= 3) {
    const userAttempts = results[2][1] as number;
    if (userAttempts > RATE_LIMIT_MAX_ATTEMPTS) {
      return false;
    }
  }

  return true;
}
