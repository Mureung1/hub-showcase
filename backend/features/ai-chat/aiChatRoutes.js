import { Router } from "express";
import { authenticateGuestSession } from "../../security/authenticateGuestSession.js";
import { createGeminiChatGenerator } from "./aiChatService.js";
import { validateAiChatRequest } from "./aiChatValidation.js";

export function createAiChatRouter({
  authenticateGuest = authenticateGuestSession,
  guestAuthenticationOptions,
  generateResponse = createGeminiChatGenerator()
} = {}) {
  const router = Router();

  router.post("/responses", async (request, response) => {
    await authenticateGuest(request, guestAuthenticationOptions);
    const input = validateAiChatRequest(request.body);
    const generated = await generateResponse(input);

    response.status(200).json({
      success: true,
      data: generated
    });
  });

  return router;
}

