import { Router } from "express";
import {
  createEmotionAnalysis,
  listEmotionAnalysesBySession
} from "../../repositories/emotionAnalysisRepository.js";
import { toEmotionAnalysisDto } from "./emotionAnalysisMapper.js";
import {
  validateCreateEmotionAnalysis,
  validateListEmotionAnalyses
} from "./emotionAnalysisValidation.js";
import { authenticateGuestSession } from "../../security/authenticateGuestSession.js";

export function createEmotionAnalysisRouter({
  createAnalysis = createEmotionAnalysis,
  listAnalyses = listEmotionAnalysesBySession,
  authenticateGuest = authenticateGuestSession,
  guestAuthenticationOptions
} = {}) {
  const router = Router();

  router.post("/", async (request, response) => {
    const { session } = await authenticateGuest(
      request,
      guestAuthenticationOptions
    );
    const record = {
      ...validateCreateEmotionAnalysis(request.body),
      guest_session_id: session.id
    };
    const createdRecord = await createAnalysis(record);

    response.status(201).json({
      success: true,
      data: {
        emotionAnalysis: toEmotionAnalysisDto(createdRecord)
      }
    });
  });

  router.get("/", async (request, response) => {
    const { session } = await authenticateGuest(
      request,
      guestAuthenticationOptions
    );
    const { limit } = validateListEmotionAnalyses(request.query);
    const records = await listAnalyses(session.id, limit);

    response.status(200).json({
      success: true,
      data: {
        emotionAnalyses: records.map(toEmotionAnalysisDto)
      },
      meta: {
        count: records.length,
        limit
      }
    });
  });

  return router;
}
