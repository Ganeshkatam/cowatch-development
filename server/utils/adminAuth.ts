import crypto from "crypto";
import config from "../config.ts";

export function authorizeAdmin(authHeader: string | undefined): boolean {
  if (!config.ADMIN_API_KEY) {
    // Fail-closed if no key is configured
    return false;
  }
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const providedKey = authHeader.slice(7);
  
  try {
    const expected = Buffer.from(config.ADMIN_API_KEY, "utf8");
    const provided = Buffer.from(providedKey, "utf8");
    if (expected.length !== provided.length) {
      return false;
    }
    return crypto.timingSafeEqual(expected, provided);
  } catch (e) {
    return false;
  }
}
