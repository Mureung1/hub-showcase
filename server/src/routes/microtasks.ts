import { Router } from "express";
import {
  GeminiMicrotaskError,
  generateGeminiMicrotask,
  generateGeminiLv3Microtask,
  getServerLv2FallbackMicroTask,
  getServerLv3FallbackMicroTask,
  isFallbackEligibleError,
  type GeminiMicrotaskInput,
  type GeminiLv3MicrotaskInput,
} from "../lib/geminiMicrotask.js";
import { findLv3MemoryContext } from "../lib/lv3MemoryCandidate.js";

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
    | "invalid_lv2_microtask"
    | "invalid_reason_changed"
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
      // Gemini 호출/파싱/품질 검사가 실패해도 사용자 요청은 실패하지 않는다 — 실패
      // category/stage/rule은 이미 geminiMicrotask.ts의 logFailure()가 로그로 남겼으니
      // (원래 실패 원인은 서버 로그에만 남고, 사용자 응답에는 내부 detail을 노출하지 않는다)
      // 여기서는 규칙 기반 microTask로 즉시 200을 돌려준다. configuration_missing(예:
      // API 키 미설정)처럼 일시적이지 않은 설정 문제만 예외적으로 기존 5xx를 유지한다.
      if (isFallbackEligibleError(error)) {
        try {
          const fallbackMicroTask = getServerLv2FallbackMicroTask(
            type,
            reason as GeminiMicrotaskInput["reason"],
          );
          res.json({ data: { microTask: fallbackMicroTask, source: "rule_based" } });
          return;
        } catch (fallbackError) {
          console.error(
            '[gemini-microtask] {"event":"gemini_microtask_fallback_failed"}',
            fallbackError,
          );
          // fallback 생성 자체가 실패한 경우에만 아래 5xx로 떨어진다.
        }
      }

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

router.post("/lv3", async (req, res) => {
  const {
    taskId,
    reason,
    customReason,
    reasonChanged,
    lv2MicroTask,
    level,
  } = req.body ?? {};

  if (
    typeof taskId !== "string" ||
    taskId.trim().length === 0 ||
    taskId.trim().length > 128
  ) {
    res.status(400).json({
      error: { code: "invalid_task_id", message: "할일을 확인해주세요." },
    });
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

  let normalizedLv2MicroTask: string | null = null;
  if (lv2MicroTask !== undefined && lv2MicroTask !== null) {
    if (typeof lv2MicroTask !== "string") {
      sendValidationError(
        res,
        "invalid_lv2_microtask",
        "이전 첫 행동을 확인해주세요.",
      );
      return;
    }
    normalizedLv2MicroTask = normalizeWhitespace(lv2MicroTask);
    if (
      normalizedLv2MicroTask.length === 0 ||
      unicodeLength(normalizedLv2MicroTask) > 60 ||
      /[\r\n]/.test(lv2MicroTask)
    ) {
      sendValidationError(
        res,
        "invalid_lv2_microtask",
        "이전 첫 행동을 확인해주세요.",
      );
      return;
    }
  }

  const normalizedReasonChanged =
    reasonChanged === undefined ? null : reasonChanged;
  if (
    normalizedReasonChanged !== null &&
    typeof normalizedReasonChanged !== "boolean"
  ) {
    sendValidationError(
      res,
      "invalid_reason_changed",
      "회피 이유 변경 여부를 확인해주세요.",
    );
    return;
  }

  if (level !== 3) {
    sendValidationError(res, "invalid_level", "Lv.3 요청만 지원합니다.");
    return;
  }

  // catch 블록에서 fallback을 만들려면 taskId로 조회한 type이 필요하다 — try 스코프
  // 밖에서도 읽을 수 있게 미리 선언해둔다. generate 호출 이전에 실패하면(예: taskId를
  // 못 찾음) null로 남아 fallback을 시도하지 않는다(잘못된 요청/DB 오류까지 숨기지 않음).
  let currentTaskType: string | null = null;

  try {
    const context = await findLv3MemoryContext(taskId.trim());
    if (!context) {
      res.status(404).json({
        error: { code: "not_found", message: "할일을 찾을 수 없습니다." },
      });
      return;
    }
    currentTaskType = context.currentTask.type;

    const input: GeminiLv3MicrotaskInput = {
      title: context.currentTask.title,
      type: context.currentTask.type,
      reason: reason as GeminiMicrotaskInput["reason"],
      customReason: normalizedCustomReason,
      reasonChanged: normalizedReasonChanged,
      lv2MicroTask: normalizedLv2MicroTask,
      sourceDoneEventId: context.candidate?.sourceDoneEventId ?? null,
      sourceTaskTitle: context.candidate?.sourceTaskTitle ?? null,
      sourceMicroTask: context.candidate?.sourceMicroTask ?? null,
    };
    const microTask = await generateGeminiLv3Microtask(input);

    res.json({
      data: {
        status: "generated",
        microTask,
        source: "gemini",
        // 추적용 참조만 전달한다. done API는 이 값을 신뢰하지 않고 실제 done
        // 이벤트를 다시 조회해 memoryEvidence 스냅샷을 구성한다.
        memoryEvidence: context.candidate
          ? {
              sourceDoneEventId: context.candidate.sourceDoneEventId,
            }
          : null,
      },
    });
  } catch (error) {
    if (error instanceof GeminiMicrotaskError) {
      // Lv2와 동일한 원칙: 실패 category/stage/rule은 이미 로그로 남았으니(사용자
      // 응답에는 노출 안 함) 규칙 기반 microTask로 즉시 200을 돌려준다. currentTaskType이
      // 없으면(할일 조회 자체가 안 된 경우) fallback을 만들 근거가 없으므로 시도하지 않는다.
      if (isFallbackEligibleError(error) && currentTaskType) {
        try {
          const fallbackMicroTask = getServerLv3FallbackMicroTask(currentTaskType);
          res.json({
            data: {
              status: "generated",
              microTask: fallbackMicroTask,
              source: "rule_based",
              memoryEvidence: null,
            },
          });
          return;
        } catch (fallbackError) {
          console.error(
            '[gemini-microtask] {"event":"gemini_lv3_microtask_fallback_failed"}',
            fallbackError,
          );
          // fallback 생성 자체가 실패한 경우에만 아래 5xx로 떨어진다.
        }
      }

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
      '[gemini-microtask] {"event":"gemini_lv3_microtask_failed","category":"unexpected_error"}',
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
