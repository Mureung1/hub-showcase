import type { Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { createUserClient } from "../../shared/supabase/userClient.js";
import { sendError } from "../../shared/http/errorEnvelope.js";
import { AppError } from "../../shared/http/appError.js";
import * as sourceAnswersRepo from "../sourceAnswers/sourceAnswers.repository.js";
import * as repo from "./finalAnswers.repository.js";

/**
 * FinalAnswer Controller (SPEC-AI-003 §8.1).
 *
 * **폴링과 새로고침 복원이 같은 경로를 쓴다.** 충돌이 있는 경로는 사용자 판단 중에 SSE가
 * 닫혀 있어 PATCH가 즉시 반환하고 web이 이것을 폴링한다. 새로고침 복원도 같은 것을 쓰므로
 * 경로가 하나로 줄어든다 — SSE를 다시 열지 않는 이유다.
 *
 * ⚠️ **404와 null을 구분한다.**
 * ```text
 * Question이 없거나 미소유          → 404
 * Question은 있는데 아직 미생성      → 200 + { finalAnswer: null, decisionNote: null }
 * ```
 * 조회 대상은 "이 Question의 FinalAnswer 상태"이고 Question은 존재한다. 미생성을 404로
 * 주면 폴링이 그것을 오류로 다루게 된다.
 */

const paramsSchema = z.object({
  chatId: z.string().uuid(),
  questionId: z.string().uuid(),
});

/** GET /api/chats/:chatId/questions/:questionId/final-answer */
export async function getFinalAnswer(
  request: Request,
  response: Response,
): Promise<void> {
  const params = paramsSchema.safeParse(request.params);
  if (!params.success) {
    sendError(response, 400, "VALIDATION_ERROR", "잘못된 경로 파라미터입니다.");
    return;
  }

  const { auth } = request as AuthenticatedRequest;
  const userClient = createUserClient(auth.token);

  try {
    // 소유권 — RLS로 안 보이면 남의 것이거나 없는 것. 둘을 구분해 알려주지 않는다.
    const question = await sourceAnswersRepo.findOwnedQuestion(
      userClient,
      params.data.chatId,
      params.data.questionId,
    );
    if (!question) {
      throw new AppError(
        404,
        "QUESTION_NOT_FOUND",
        "대상 Question을 찾을 수 없습니다.",
      );
    }

    const [finalAnswer, decisionNote] = await Promise.all([
      repo.findFinalAnswer(userClient, params.data.questionId),
      repo.findDecisionNote(userClient, params.data.questionId),
    ]);

    // 미생성은 정상 상태다 — 폴링이 계속 돌 수 있게 200으로 준다.
    response.status(200).json({ finalAnswer, decisionNote });
  } catch (error) {
    if (error instanceof AppError) {
      sendError(response, error.status, error.code, error.message);
      return;
    }
    console.error(
      "[finalAnswers]",
      error instanceof Error ? error.message : error,
    );
    sendError(response, 500, "INTERNAL_ERROR", "요청을 처리하지 못했습니다.");
  }
}
