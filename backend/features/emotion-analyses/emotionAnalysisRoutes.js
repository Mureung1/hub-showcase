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

const emotionAnalysisRouter = Router();

emotionAnalysisRouter.post("/", async (request, response) => {
  const record = validateCreateEmotionAnalysis(request.body);
  const createdRecord = await createEmotionAnalysis(record);

  response.status(201).json({
    success: true,
    data: {
      emotionAnalysis: toEmotionAnalysisDto(createdRecord)
    }
  });
});

emotionAnalysisRouter.get("/", async (request, response) => {
  const { sessionId, limit } = validateListEmotionAnalyses(request.query);
  const records = await listEmotionAnalysesBySession(sessionId, limit);

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

export default emotionAnalysisRouter;
