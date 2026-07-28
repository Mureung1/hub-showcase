import { Router, type Request, type Response } from "express";

import {
  RecipeStructureError,
  structureRecipe,
} from "../services/recipeStructure.service.js";

import { collectUrlContent, UrlContentError } from "../services/urlContent.service.js";
import {
  collectYoutubeContentFromEnvironment,
  isYoutubeSourceUrl,
  YoutubeContentError,
} from "../services/youtubeContent.service.js";

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

    const sourceUrlValue = requestBody.sourceUrl;
    const rawTextValue = requestBody.rawText;

    if (
      (sourceUrlValue !== undefined &&
        sourceUrlValue !== null &&
        typeof sourceUrlValue !== "string") ||
      (rawTextValue !== undefined &&
        rawTextValue !== null &&
        typeof rawTextValue !== "string")
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "입력값을 확인해 주세요.",
        },
      });
    }

    const sourceUrl =
      typeof sourceUrlValue === "string" ? sourceUrlValue.trim() : "";
    const rawText =
      typeof rawTextValue === "string" ? rawTextValue.trim() : "";

    if (!sourceUrl && !rawText) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "입력값을 확인해 주세요.",
          details: [
            {
              field: "rawText",
              message: "URL 또는 레시피 원문 중 하나를 입력해 주세요.",
            },
          ],
        },
      });
    }

    if (rawText.replace(/\s/g, "").length > MAX_RAW_TEXT_LENGTH) {
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
      const collectedContent = sourceUrl
        ? isYoutubeSourceUrl(sourceUrl)
          ? await collectYoutubeContentFromEnvironment(sourceUrl)
          : await collectUrlContent(sourceUrl)
        : null;

      const structureInput = collectedContent
        ? rawText
          ? `URL에서 수집한 레시피 내용:\n${collectedContent.text}\n\n사용자 보완 정보:\n${rawText}`
          : collectedContent.text
        : rawText;

      const result = await structureRecipe(
        structureInput,
        collectedContent?.source ?? null,
      );

      return res.status(200).json({
        data: result,
      });
    } catch (error) {
      if (
        error instanceof UrlContentError ||
        error instanceof YoutubeContentError
      ) {
        const status = error.code === "URL_FETCH_FAILED" ? 422 : 400;

        const message =
          error.code === "INVALID_URL"
            ? "URL 형식을 확인해 주세요."
            : error.code === "URL_NOT_ALLOWED"
              ? "접근할 수 없는 URL입니다."
              : "URL 내용을 가져오지 못했습니다. 레시피 내용을 직접 입력해 주세요.";

        return res.status(status).json({
          error: {
            code: error.code,
            message,
          },
        });
      }

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
