import type { Request, Response } from "express";
import { SourceRefSchema } from "@decision-log/shared";
import { z } from "zod";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { createUserClient } from "../../shared/supabase/userClient.js";
import { sendError } from "../../shared/http/errorEnvelope.js";
import { AppError } from "../../shared/http/appError.js";
import * as sourceAnswersRepo from "../sourceAnswers/sourceAnswers.repository.js";
import * as repo from "./agendas.repository.js";
import * as service from "./agendas.service.js";

/**
 * Agenda Controller (SPEC-AI-002 §12.3·§12.4).
 *
 * - GET: 새로고침 복원용 스냅샷. 사용자 JWT + RLS로 본인 것만 보인다.
 * - PATCH: 사용자 판단(채택·직접 입력·제외). 사용자 행동이므로 RLS 경로로 쓴다.
 *
 * 소유권은 검증된 JWT userId로만 판단한다 — **body의 userId는 읽지 않는다.**
 * 아래 Zod 스키마는 알려진 키만 통과시키므로(z.object 기본 strip) 위조 userId는 조용히 버려진다.
 */

const paramsSchema = z.object({
  chatId: z.string().uuid(),
  questionId: z.string().uuid(),
});

const agendaParamsSchema = paramsSchema.extend({
  agendaId: z.string().uuid(),
});

const userNoteSchema = z.string().max(2000).nullish();

/**
 * §12.4 — 이번 범위의 액션은 `accept`·`compose`·`reject` 셋뿐이다.
 * `recheck`·`retry_recheck`는 Manager 재호출을 유발하므로 T-019.4에서 다룬다.
 */
const patchBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("accept"),
    /** 채택할 출처. 내용은 서버가 원본에서 되읽는다 — 클라이언트 본문을 신뢰하지 않는다. */
    sourceRef: SourceRefSchema,
    userNote: userNoteSchema,
  }),
  z.object({
    action: z.literal("compose"),
    content: z.string().min(1).max(20_000),
    userNote: userNoteSchema,
  }),
  z.object({
    action: z.literal("reject"),
    userNote: userNoteSchema,
  }),
]);

function handle(response: Response, error: unknown): void {
  if (error instanceof AppError) {
    sendError(response, error.status, error.code, error.message);
    return;
  }
  console.error("[agendas]", error instanceof Error ? error.message : error);
  sendError(response, 500, "INTERNAL_ERROR", "요청을 처리하지 못했습니다.");
}

/**
 * GET /api/chats/:chatId/questions/:questionId/agendas
 * 새로고침·재진입 시 현재 스냅샷 복원 (§12.3). 응답은 shared 계약의 `Agenda[]`.
 */
export async function getAgendas(
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
    // RLS로 안 보이면 남의 것이거나 없는 것 — 둘을 구분해 알려주지 않는다.
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
    const agendas = await repo.listByQuestion(
      userClient,
      params.data.questionId,
    );
    response.status(200).json(agendas);
  } catch (error) {
    handle(response, error);
  }
}

/**
 * PATCH /api/chats/:chatId/questions/:questionId/agendas/:agendaId
 * 사용자 판단 — 채택·직접 입력·제외 (§12.4). 허용되지 않은 전이는 409.
 */
export async function patchAgenda(
  request: Request,
  response: Response,
): Promise<void> {
  const params = agendaParamsSchema.safeParse(request.params);
  if (!params.success) {
    sendError(response, 400, "VALIDATION_ERROR", "잘못된 경로 파라미터입니다.");
    return;
  }
  const body = patchBodySchema.safeParse(request.body ?? {});
  if (!body.success) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "action은 accept·compose·reject 중 하나여야 하며 필요한 필드가 있어야 합니다.",
    );
    return;
  }

  const { auth } = request as AuthenticatedRequest;
  const userClient = createUserClient(auth.token);

  try {
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

    const agenda = await service.applyUserDecision({
      userClient,
      chatId: params.data.chatId,
      questionId: params.data.questionId,
      agendaId: params.data.agendaId,
      action: body.data.action,
      sourceRef: body.data.action === "accept" ? body.data.sourceRef : undefined,
      content: body.data.action === "compose" ? body.data.content : undefined,
      userNote: body.data.userNote ?? null,
    });
    response.status(200).json(agenda);
  } catch (error) {
    handle(response, error);
  }
}
