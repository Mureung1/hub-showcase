import { Router } from "express";
import { GUEST_KEY_HEADER, GUEST_SESSION_LIMITS } from "../../../shared/contracts/guestSessionContract.js";
import {
  generateGuestRecoveryKey,
  hashGuestRecoveryKey,
  InvalidGuestRecoveryKeyError
} from "../../security/guestRecoveryKey.js";
import {
  createGuestSession,
  deleteGuestSession,
  findActiveGuestSessionByKeyHash,
  touchGuestSession
} from "../../repositories/guestSessionRepository.js";
import { GuestAuthenticationError } from "../../security/authenticateGuestSession.js";

export class GuestSessionRequestError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "GuestSessionRequestError";
    this.code = code;
    this.status = status;
  }
}

function readRecoveryKey(request) {
  const value = request.get(GUEST_KEY_HEADER);

  if (!value) {
    throw new GuestSessionRequestError(
      "GUEST_KEY_REQUIRED",
      `The ${GUEST_KEY_HEADER} header is required.`
    );
  }

  return value;
}

function requirePepper(pepper) {
  if (typeof pepper !== "string" || pepper.length < 32) {
    throw new GuestSessionRequestError(
      "GUEST_SESSION_NOT_CONFIGURED",
      "Guest sessions are not configured.",
      503
    );
  }
}

function sessionDto(session) {
  return {
    createdAt: session.created_at,
    lastAccessedAt: session.last_accessed_at,
    expiresAt: session.expires_at
  };
}

export function createGuestSessionRouter({
  pepper = process.env.GUEST_KEY_PEPPER,
  createSession = createGuestSession,
  findSession = findActiveGuestSessionByKeyHash,
  touchSession = touchGuestSession,
  deleteSession = deleteGuestSession,
  now = () => new Date()
} = {}) {
  const router = Router();

  router.post("/", async (request, response) => {
    requirePepper(pepper);
    const recoveryKey = generateGuestRecoveryKey();
    const keyHash = hashGuestRecoveryKey(recoveryKey, pepper);
    const currentTime = now();
    const expiresAt = new Date(
      currentTime.valueOf() +
        GUEST_SESSION_LIMITS.retentionDays * 24 * 60 * 60 * 1000
    );
    const session = await createSession({ keyHash, expiresAt });

    response.set("Cache-Control", "no-store");
    response.status(201).json({
      success: true,
      data: {
        recoveryKey,
        guestSession: sessionDto(session)
      }
    });
  });

  router.post("/recover", async (request, response) => {
    requirePepper(pepper);
    const keyHash = hashGuestRecoveryKey(readRecoveryKey(request), pepper);
    const currentTime = now();
    const session = await findSession(keyHash, currentTime);

    if (!session) {
      throw new GuestSessionRequestError(
        "GUEST_SESSION_NOT_FOUND",
        "The guest session was not found or has expired.",
        404
      );
    }

    const touchedSession = await touchSession(session.id, currentTime);
    response.set("Cache-Control", "no-store");
    response.status(200).json({
      success: true,
      data: { guestSession: sessionDto(touchedSession) }
    });
  });

  router.delete("/current", async (request, response) => {
    requirePepper(pepper);
    const keyHash = hashGuestRecoveryKey(readRecoveryKey(request), pepper);
    const currentTime = now();
    const session = await findSession(keyHash, currentTime);

    if (session) {
      await deleteSession(session.id, keyHash);
    }

    response.set("Cache-Control", "no-store");
    response.status(204).end();
  });

  return router;
}

export function mapGuestSessionError(error, response) {
  if (error instanceof GuestAuthenticationError) {
    response.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message }
    });
    return true;
  }

  if (error instanceof InvalidGuestRecoveryKeyError) {
    response.status(400).json({
      success: false,
      error: {
        code: "INVALID_GUEST_KEY",
        message: "The guest recovery key is invalid."
      }
    });
    return true;
  }

  if (error instanceof GuestSessionRequestError) {
    response.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message }
    });
    return true;
  }

  return false;
}
