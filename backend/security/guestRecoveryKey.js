import {
  createHmac,
  randomBytes,
  timingSafeEqual
} from "node:crypto";
import {
  GUEST_KEY_ALPHABET,
  GUEST_KEY_DISPLAY_PATTERN,
  GUEST_KEY_GROUP_SIZE,
  GUEST_KEY_RAW_LENGTH
} from "../../shared/contracts/guestSessionContract.js";

const HASH_PATTERN = /^[0-9a-f]{64}$/;
const MINIMUM_PEPPER_LENGTH = 32;

export class InvalidGuestRecoveryKeyError extends Error {
  constructor() {
    super("The guest recovery key is invalid.");
    this.name = "InvalidGuestRecoveryKeyError";
    this.code = "INVALID_GUEST_KEY";
  }
}

export function generateGuestRecoveryKey() {
  const random = randomBytes(GUEST_KEY_RAW_LENGTH);
  const rawKey = Array.from(
    random,
    (byte) => GUEST_KEY_ALPHABET[byte & 31]
  ).join("");

  return rawKey.match(
    new RegExp(`.{1,${GUEST_KEY_GROUP_SIZE}}`, "g")
  ).join("-");
}

export function normalizeGuestRecoveryKey(value) {
  if (typeof value !== "string") {
    throw new InvalidGuestRecoveryKeyError();
  }

  const rawKey = value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
  const displayKey = rawKey.match(
    new RegExp(`.{1,${GUEST_KEY_GROUP_SIZE}}`, "g")
  )?.join("-");

  if (
    rawKey.length !== GUEST_KEY_RAW_LENGTH ||
    !displayKey ||
    !GUEST_KEY_DISPLAY_PATTERN.test(displayKey)
  ) {
    throw new InvalidGuestRecoveryKeyError();
  }

  return displayKey;
}

export function hashGuestRecoveryKey(value, pepper) {
  if (typeof pepper !== "string" || pepper.length < MINIMUM_PEPPER_LENGTH) {
    throw new TypeError(
      `Guest key pepper must contain at least ${MINIMUM_PEPPER_LENGTH} characters.`
    );
  }

  const normalizedKey = normalizeGuestRecoveryKey(value);
  return createHmac("sha256", pepper)
    .update(normalizedKey, "utf8")
    .digest("hex");
}

export function guestKeyHashesMatch(left, right) {
  if (
    typeof left !== "string" ||
    typeof right !== "string" ||
    !HASH_PATTERN.test(left) ||
    !HASH_PATTERN.test(right)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(left, "hex"),
    Buffer.from(right, "hex")
  );
}

