import type { Request, Response } from "express";
import {
  SourceAnswerEventSchema,
  type SourceAnswerEvent,
} from "@decision-log/shared";
import { z } from "zod";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { createUserClient } from "../../shared/supabase/userClient.js";
import { sendError } from "../../shared/http/errorEnvelope.js";
import { AppError } from "../../shared/http/appError.js";
import { ALL_PROVIDERS } from "./providers/registry.js";
import * as repo from "./sourceAnswers.repository.js";
import * as service from "./sourceAnswers.service.js";

/**
 * SourceAnswer Controller (SPEC-AI-001 4장).
 *
 * POST는 **응답 자체를 SSE 스트림으로 연다**. web은 EventSource 대신 fetch ReadableStream으로
 * 소비한다 — EventSource는 커스텀 헤더 불가·GET 전용이라 토큰을 URL에 실어야 하기 때문(§4 구현 노트).
 * 사전 점검·소유권 실패는 스트림을 열기 전에 일반 에러 봉투로 응답한다.
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

/** SSE 프레임 하나를 내보낸다. 나가는 이벤트도 공유 계약으로 검증한다. */
function writeEvent(response: Response, event: SourceAnswerEvent): void {
  if (response.writableEnded) return;
  const parsed = SourceAnswerEventSchema.parse(event);
  response.write(`data: ${JSON.stringify(parsed)}\n\n`);
}

/**
 * POST /api/chats/:chatId/questions/:questionId/source-answers
 * 생성 시작(명시적) — 진행 상황을 SSE로 푸시하고 done에 최종 스냅샷을 싣는다.
 */
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
  const userClient = createUserClient(auth.token);

  // 스트림을 열기 전 게이트 — 실패는 일반 에러 봉투(404 / NO_AVAILABLE_KEYS)
  let prepared: service.PreparedGeneration;
  try {
    prepared = await service.prepareGeneration({
      userClient,
      userId: auth.userId,
      chatId: params.data.chatId,
      questionId: params.data.questionId,
    });
  } catch (error) {
    handle(response, error);
    return;
  }

  // 여기서부터 SSE. 헤더를 먼저 내보내 클라이언트가 즉시 읽기 시작하게 한다.
  response.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // 프록시 버퍼링 방지(중간 프록시가 스트림을 모아두면 실시간성이 사라진다)
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders();

  // 3사 초기 상태(pending)를 한 번씩 알린다 — web이 로딩 말풍선을 즉시 점등한다.
  for (const provider of ALL_PROVIDERS) {
    writeEvent(response, {
      type: "source_answer.updated",
      provider,
      status: "pending",
      errorCode: null,
    });
  }

  try {
    const sourceAnswers = await service.runGeneration({
      ...prepared,
      userClient,
      questionId: params.data.questionId,
      context: body.data.context ?? null,
      onUpdate: (event) => {
        writeEvent(response, {
          type: "source_answer.updated",
          provider: event.provider,
          status: event.status,
          errorCode: event.errorCode,
        });
      },
    });

    writeEvent(response, { type: "done", sourceAnswers });
  } catch (error) {
    // 스트림 도중 치명 오류 전용 이벤트는 MVP 범위 밖(좌초 복구). 서버에만 남기고 스트림을 닫는다.
    console.error(
      "[sourceAnswers] 스트림 처리 실패:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    response.end();
  }
}

/**
 * GET /api/chats/:chatId/questions/:questionId/source-answers
 * 새로고침·재진입 시 현재 스냅샷 복원 (§4). 사용자 JWT + RLS로 본인 것만 보인다.
 */
export async function getSourceAnswers(
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
    const question = await repo.findOwnedQuestion(
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
    const answers = await repo.listByQuestion(
      userClient,
      params.data.questionId,
    );
    response.status(200).json(answers);
  } catch (error) {
    handle(response, error);
  }
}
