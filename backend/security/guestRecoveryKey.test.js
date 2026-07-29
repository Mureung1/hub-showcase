import { describe, expect, it } from "vitest";
import {
  GUEST_KEY_DISPLAY_PATTERN
} from "../../shared/contracts/guestSessionContract.js";
import {
  InvalidGuestRecoveryKeyError,
  generateGuestRecoveryKey,
  guestKeyHashesMatch,
  hashGuestRecoveryKey,
  normalizeGuestRecoveryKey
} from "./guestRecoveryKey.js";

const pepper = "test-only-pepper-with-at-least-32-characters";

describe("guest recovery keys", () => {
  it("creates unique 160-bit display keys using the restricted alphabet", () => {
    const keys = new Set(
      Array.from({ length: 100 }, () => generateGuestRecoveryKey())
    );

    expect(keys).toHaveProperty("size", 100);
    keys.forEach((key) => {
      expect(key).toMatch(GUEST_KEY_DISPLAY_PATTERN);
      expect(key.replaceAll("-", "")).toHaveLength(32);
    });
  });

  it("normalizes case, spaces, and separators", () => {
    expect(
      normalizeGuestRecoveryKey(
        "abcd efgh-jkmn pqrt vwxy z012 3456 789a"
      )
    ).toBe("ABCD-EFGH-JKMN-PQRT-VWXY-Z012-3456-789A");
  });

  it("creates stable keyed hashes without returning the recovery key", () => {
    const key = generateGuestRecoveryKey();
    const firstHash = hashGuestRecoveryKey(key, pepper);
    const secondHash = hashGuestRecoveryKey(key.toLowerCase(), pepper);

    expect(firstHash).toMatch(/^[0-9a-f]{64}$/);
    expect(firstHash).not.toContain(key);
    expect(guestKeyHashesMatch(firstHash, secondHash)).toBe(true);
  });

  it("rejects malformed keys without echoing sensitive input", () => {
    const malformed = "SECRET-KEY-THAT-MUST-NOT-BE-ECHOED";

    expect(() => normalizeGuestRecoveryKey(malformed)).toThrow(
      InvalidGuestRecoveryKeyError
    );

    try {
      normalizeGuestRecoveryKey(malformed);
    } catch (error) {
      expect(error.message).not.toContain(malformed);
    }
  });

  it("requires a strong server-side pepper and validates hash inputs", () => {
    const key = generateGuestRecoveryKey();

    expect(() => hashGuestRecoveryKey(key, "too-short")).toThrow(TypeError);
    expect(guestKeyHashesMatch("invalid", "invalid")).toBe(false);
  });
});
