import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { ApiError } from "./apiErrors.mjs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

export function createShareToken() {
  return randomBytes(32).toString("base64url");
}

export function privacyIdentifier(userId, secret = process.env.SAFETY_IDENTIFIER_SECRET || "") {
  return sha256(`${secret}:${userId}`).slice(0, 64);
}

export function requireUuid(value, fieldName = "id") {
  if (!UUID_PATTERN.test(String(value || ""))) {
    throw new ApiError(400, "INVALID_IDENTIFIER", `${fieldName} 형식이 올바르지 않습니다.`);
  }
  return String(value);
}

export function clientIp(req) {
  const cloudflare = firstValidIp(req.headers["cf-connecting-ip"]);
  if (cloudflare) return cloudflare;
  const forwarded = lastValidIp(req.headers["x-forwarded-for"]);
  if (forwarded) return forwarded;
  return firstValidIp(req.socket?.remoteAddress) || "unknown";
}

function firstValidIp(value) {
  const candidate = String(value || "").split(",")[0].trim();
  return isIP(candidate) ? candidate : null;
}

function lastValidIp(value) {
  const candidates = String(value || "")
    .split(",")
    .map((candidate) => candidate.trim())
    .filter((candidate) => isIP(candidate));
  return candidates.at(-1) || null;
}
