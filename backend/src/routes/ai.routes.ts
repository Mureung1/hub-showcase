import { Router, type Request, type Response } from "express";

import {
  RecipeStructureError,
  structureRecipe,
} from "../services/recipeStructure.service.js";

const router = Router();
const MAX_RAW_TEXT_LENGTH = 20_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

const requestTimestampsByUser = new Map<string, number[]>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function isRateLimited(firebaseUid: string) {
  const now = Date.now();
  const activeTimestamps = (
    requestTimestampsByUser.get(firebaseUid) ?? []
  ).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (activeTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestTimestampsByUser.set(firebaseUid, activeTimestamps);
    return true;
  }

  activeTimestamps.push(now);
  requestTimestampsByUser.set(firebaseUid, activeTimestamps);

  return false;
}

router.post(
  "/recipes/structure",
  async (req: Request, res: Response) => {
    const requestBody: unknown = req.body;

    if (!isRecord(requestBody)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "입력값을 확인해 주세요.",
        },
      });
    }

    const hasUnexpectedField = Object.keys(requestBody).some(
      (key) => key !== "sourceUrl" && key !== "rawText",
    );

    if (hasUnexpectedField) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "입력값을 확인해 주세요.",
        },
      });
    }

    if (
      requestBody.sourceUrl !== undefined &&
      requestBody.sourceUrl !== null
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "입력값을 확인해 주세요.",
          details: [
            {
              field: "sourceUrl",
              message: "URL 입력은 아직 지원하지 않습니다.",
            },
          ],
        },
      });
    }

    if (
      typeof requestBody.rawText !== "string" ||
      requestBody.rawText.trim().length === 0
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "입력값을 확인해 주세요.",
          details: [
            {
              field: "rawText",
              message: "레시피 원문을 입력해 주세요.",
            },
          ],
        },
      });
    }

    const rawText = requestBody.rawText.trim();

    if (rawText.length > MAX_RAW_TEXT_LENGTH) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "입력값을 확인해 주세요.",
          details: [
            {
              field: "rawText",
              message: "레시피 원문은 20,000자 이하여야 합니다.",
            },
          ],
        },
      });
    }

    const firebaseUser = req.firebaseUser;

    if (!firebaseUser) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        },
      });
    }

    if (isRateLimited(firebaseUser.uid)) {
      return res.status(429).json({
        error: {
          code: "AI_RATE_LIMITED",
          message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        },
      });
    }

    try {
      const result = await structureRecipe(rawText);

      return res.status(200).json({
        data: result,
      });
    } catch (error) {
      if (!(error instanceof RecipeStructureError)) {
        throw error;
      }

      const message =
        error.code === "AI_RESPONSE_INVALID"
          ? "AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요."
          : "AI가 레시피를 정리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

      return res.status(502).json({
        error: {
          code: error.code,
          message,
        },
      });
    }
  }
);

export default router;