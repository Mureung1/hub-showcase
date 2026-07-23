import type { Request, Response } from "express";
import {
  SourceAnswerEventSchema,
  type SourceAnswerEvent,
} from "@decision-log/shared";
import { z } from "zod";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { createUserClient } from "../../shared/supabase/userClient.js";
import { getAdminClient } from "../../shared/supabase/adminClient.js";
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

/** SSE 주석 프레임 — 데이터가 아니라 연결 유지용 신호다(파서가 무시한다). */
const HEARTBEAT_FRAME = ":hb\n\n";
/** 프록시 유휴 타임아웃(통상 30~60초)보다 넉넉히 짧게 둔다. */
const HEARTBEAT_INTERVAL_MS = 15_000;

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

  // 유휴 연결 차단 방지(T-017): Provider 호출은 45초×재시도라 이벤트 없이 오래 조용할 수 있고,
  // 배포 환경의 중간 프록시가 그 사이 연결을 끊을 수 있다. SSE 주석 프레임을 주기적으로 흘린다.
  // 주석 프레임은 `data:`로 시작하지 않아 클라이언트 파서가 무시하므로 이벤트 계약에 영향이 없다.
  const heartbeat = setInterval(() => {
    if (response.writableEnded) return;
    response.write(HEARTBEAT_FRAME);
  }, HEARTBEAT_INTERVAL_MS);

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
    // 에러 전용 이벤트는 두지 않는다(이벤트 계약 2종 유지). 대신 **항상 터미널 신호(done)** 를
    // 보내 클라이언트가 매달리지 않게 한다. 남은 미종결 행은 실패로 마감해 상태를 정합하게 만든다.
    console.error(
      "[sourceAnswers] 스트림 처리 실패:",
      error instanceof Error ? error.message : error,
    );
    try {
      await repo.failUnfinished(
        getAdminClient(),
        params.data.questionId,
        "생성 처리 중 오류로 중단되었습니다.",
      );
      const sourceAnswers = await repo.listByQuestion(
        userClient,
        params.data.questionId,
      );
      writeEvent(response, { type: "done", sourceAnswers });
    } catch (recoveryError) {
      // 마감·재조회까지 실패하면 done 없이 닫는다(무한 루프 방지).
      // 클라이언트는 done 없는 종료를 GET 스냅샷 재조회로 화해한다.
      console.error(
        "[sourceAnswers] 종료 신호 전송 실패:",
        recoveryError instanceof Error ? recoveryError.message : recoveryError,
      );
    }
  } finally {
    // 타이머를 먼저 정리해야 응답 종료 후 write가 남지 않는다(누수·EPIPE 방지).
    clearInterval(heartbeat);
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
