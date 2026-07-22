import type { Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { createUserClient } from "../../shared/supabase/userClient.js";
import { sendError } from "../../shared/http/errorEnvelope.js";
import { AppError } from "../../shared/http/appError.js";
import * as service from "./sourceAnswers.service.js";

/**
 * SourceAnswer Controller (SPEC-AI-001 4장).
 * T-016.2a는 **동기 엔드포인트**로 코어를 실증한다 — 3사 호출·저장이 끝난 뒤 배열을 반환.
 * 같은 URL·오케스트레이션을 T-016.2b에서 SSE로 감싼다.
 *
 * 소유권은 검증된 JWT userId로만 판단한다 — body의 userId 같은 값은 쓰지 않는다.
 */

const paramsSchema = z.object({
  chatId: z.string().uuid(),
  questionId: z.string().uuid(),
});

/** 9장: 이전 Context는 web이 실어 보낸다(임시). 프롬프트 재료로만 쓴다. */
const bodySchema = z.object({
  context: z.string().max(20_000).nullish(),
});

function handle(response: Response, error: unknown): void {
  if (error instanceof AppError) {
    sendError(response, error.status, error.code, error.message);
    return;
  }
  console.error(
    "[sourceAnswers]",
    error instanceof Error ? error.message : error,
  );
  sendError(response, 500, "INTERNAL_ERROR", "요청을 처리하지 못했습니다.");
}

/** POST /api/chats/:chatId/questions/:questionId/source-answers */
export async function postSourceAnswers(
  request: Request,
  response: Response,
): Promise<void> {
  const params = paramsSchema.safeParse(request.params);
  if (!params.success) {
    sendError(response, 400, "VALIDATION_ERROR", "잘못된 경로 파라미터입니다.");
    return;
  }
  const body = bodySchema.safeParse(request.body ?? {});
  if (!body.success) {
    sendError(response, 400, "VALIDATION_ERROR", "context 형식이 잘못되었습니다.");
    return;
  }

  const { auth } = request as AuthenticatedRequest;
  try {
    const answers = await service.startGeneration({
      userClient: createUserClient(auth.token),
      userId: auth.userId,
      chatId: params.data.chatId,
      questionId: params.data.questionId,
      context: body.data.context ?? null,
    });
    response.status(201).json(answers);
  } catch (error) {
    handle(response, error);
  }
}
