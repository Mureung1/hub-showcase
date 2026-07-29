import { Router } from "express";
import { authenticateGuestSession } from "../../security/authenticateGuestSession.js";
import { consumeGuestAiQuota } from "../../repositories/guestSessionRepository.js";
import {
  AiGenerationError,
  createGeminiChatGenerator
} from "./aiChatService.js";
import { validateAiChatRequest } from "./aiChatValidation.js";

export function createAiChatRouter({
  authenticateGuest = authenticateGuestSession,
  guestAuthenticationOptions,
  consumeQuota = consumeGuestAiQuota,
  quotaOptions,
  generateResponse = createGeminiChatGenerator()
} = {}) {
  const router = Router();

  router.post("/responses", async (request, response) => {
    const { session } = await authenticateGuest(
      request,
      guestAuthenticationOptions
    );
    const input = validateAiChatRequest(request.body);
    const quotaConsumed = await consumeQuota(session.id, quotaOptions);

    if (!quotaConsumed) {
      throw new AiGenerationError(
        "AI_RATE_LIMIT_EXCEEDED",
        "The guest AI request limit has been reached.",
        { status: 429 }
      );
    }

    const generated = await generateResponse(input);

    response.status(200).json({
      success: true,
      data: generated
    });
  });

  return router;
}
