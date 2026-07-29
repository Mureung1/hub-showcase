import { GUEST_KEY_HEADER } from "../../shared/contracts/guestSessionContract.js";
import {
  hashGuestRecoveryKey,
  InvalidGuestRecoveryKeyError
} from "./guestRecoveryKey.js";
import { findActiveGuestSessionByKeyHash } from "../repositories/guestSessionRepository.js";

export class GuestAuthenticationError extends Error {
  constructor(code, message, status = 401) {
    super(message);
    this.name = "GuestAuthenticationError";
    this.code = code;
    this.status = status;
  }
}

export async function authenticateGuestSession(
  request,
  {
    pepper = process.env.GUEST_KEY_PEPPER,
    findSession = findActiveGuestSessionByKeyHash,
    now = () => new Date()
  } = {}
) {
  if (typeof pepper !== "string" || pepper.length < 32) {
    throw new GuestAuthenticationError(
      "GUEST_SESSION_NOT_CONFIGURED",
      "Guest sessions are not configured.",
      503
    );
  }

  const recoveryKey = request.get(GUEST_KEY_HEADER);

  if (!recoveryKey) {
    throw new GuestAuthenticationError(
      "GUEST_AUTH_REQUIRED",
      "A guest recovery key is required."
    );
  }

  let keyHash;
  try {
    keyHash = hashGuestRecoveryKey(recoveryKey, pepper);
  } catch (error) {
    if (error instanceof InvalidGuestRecoveryKeyError) {
      throw new GuestAuthenticationError(
        "INVALID_GUEST_AUTH",
        "The guest recovery key is invalid."
      );
    }
    throw error;
  }

  const session = await findSession(keyHash, now());

  if (!session) {
    throw new GuestAuthenticationError(
      "INVALID_GUEST_AUTH",
      "The guest recovery key is invalid or expired."
    );
  }

  return { session, keyHash };
}
