import { Router } from "express";
import {
  GeminiMicrotaskError,
  generateGeminiMicrotask,
  type GeminiMicrotaskInput,
} from "../lib/geminiMicrotask.js";

const router = Router();

const VALID_TYPES = new Set([
  "리포트/글쓰기",
  "문제풀이/암기",
  "발표/PT 준비",
  "코딩 실습",
  "시험공부",
  "프로젝트",
  "조별과제",
  "개인공부",
  "기타",
]);
const VALID_REASONS = new Set([
  "overwhelm",
  "dislike",
  "temptation",
  "custom",
]);

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function unicodeLength(value: string): number {
  return [...value].length;
}

function sendValidationError(
  res: Parameters<Parameters<typeof router.post>[1]>[1],
  code:
    | "invalid_title"
    | "invalid_type"
    | "invalid_reason"
    | "invalid_custom_reason"
    | "invalid_level",
  message: string,
): void {
  res.status(400).json({ error: { code, message } });
}

router.post("/lv2", async (req, res) => {
  const { title, type, reason, customReason, level } = req.body ?? {};

  if (typeof title !== "string") {
    sendValidationError(res, "invalid_title", "제목을 확인해주세요.");
    return;
  }
  const normalizedTitle = normalizeWhitespace(title);
  if (
    normalizedTitle.length === 0 ||
    unicodeLength(normalizedTitle) > 100
  ) {
    sendValidationError(res, "invalid_title", "제목을 확인해주세요.");
    return;
  }

  if (typeof type !== "string" || !VALID_TYPES.has(type)) {
    sendValidationError(res, "invalid_type", "할일 유형을 확인해주세요.");
    return;
  }

  if (typeof reason !== "string" || !VALID_REASONS.has(reason)) {
    sendValidationError(res, "invalid_reason", "회피 이유를 확인해주세요.");
    return;
  }

  let normalizedCustomReason: string | null = null;
  if (reason === "custom") {
    if (typeof customReason !== "string") {
      sendValidationError(
        res,
        "invalid_custom_reason",
        "직접 입력한 회피 이유를 확인해주세요.",
      );
      return;
    }
    normalizedCustomReason = normalizeWhitespace(customReason);
    if (
      normalizedCustomReason.length === 0 ||
      unicodeLength(normalizedCustomReason) > 200
    ) {
      sendValidationError(
        res,
        "invalid_custom_reason",
        "직접 입력한 회피 이유를 확인해주세요.",
      );
      return;
    }
  } else if (customReason !== undefined && customReason !== null) {
    sendValidationError(
      res,
      "invalid_custom_reason",
      "직접 입력 이유는 기타를 선택했을 때만 사용할 수 있습니다.",
    );
    return;
  }

  if (level !== 2) {
    sendValidationError(res, "invalid_level", "Lv.2 요청만 지원합니다.");
    return;
  }

  const input: GeminiMicrotaskInput = {
    title: normalizedTitle,
    type,
    reason: reason as GeminiMicrotaskInput["reason"],
    customReason: normalizedCustomReason,
  };

  try {
    const microTask = await generateGeminiMicrotask(input);
    res.json({ data: { microTask, source: "gemini" } });
  } catch (error) {
    if (error instanceof GeminiMicrotaskError) {
      const status =
        error.code === "provider_timeout"
          ? 504
          : error.code === "invalid_provider_response"
            ? 502
            : 503;
      const message =
        error.code === "provider_timeout"
          ? "첫 행동 생성 시간이 초과되었습니다."
          : error.code === "invalid_provider_response"
            ? "생성된 첫 행동을 사용할 수 없습니다."
            : "첫 행동 생성 서비스를 사용할 수 없습니다.";
      res.status(status).json({
        error: { code: error.code, message },
      });
      return;
    }

    console.error(
      '[gemini-microtask] {"event":"gemini_microtask_failed","category":"unexpected_error"}',
    );
    res.status(503).json({
      error: {
        code: "provider_unavailable",
        message: "첫 행동 생성 서비스를 사용할 수 없습니다.",
      },
    });
  }
});

export default router;
