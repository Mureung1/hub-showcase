import type { Request, Response } from "express";
import {
  CreateChatRequestSchema,
  CreateQuestionRequestSchema,
  UpdateQuestionStatusRequestSchema,
} from "@decision-log/shared";
import { z } from "zod";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { createUserClient } from "../../shared/supabase/userClient.js";
import { sendError } from "../../shared/http/errorEnvelope.js";
import { AppError } from "../../shared/http/appError.js";
import * as service from "./chats.service.js";

/**
 * Chat·Question Controller (SPEC-DB-001 5장).
 * - Body는 여기서 Zod 검증(400 VALIDATION_ERROR). 응답은 shared 계약/에러 봉투.
 * - 데이터 소유권은 검증된 JWT의 userId(RLS)로만 판단한다 — 클라이언트가 보낸 userId는 쓰지 않는다.
 *   요청의 검증된 access token으로 사용자 JWT 클라이언트(RLS)를 만들어 Repository에 넘긴다.
 */

const uuidSchema = z.string().uuid();

/** 인증 요청에서 RLS 적용 사용자 클라이언트를 만든다. */
function clientFor(request: Request) {
  const { auth } = request as AuthenticatedRequest;
  return createUserClient(auth.token);
}

/** 알 수 없는 오류를 에러 봉투로 내려준다(비밀값·스택 미포함). */
function handle(response: Response, error: unknown): void {
  if (error instanceof AppError) {
    sendError(response, error.status, error.code, error.message);
    return;
  }
  console.error("[chats]", error instanceof Error ? error.message : error);
  sendError(response, 500, "INTERNAL_ERROR", "요청을 처리하지 못했습니다.");
}

/** POST /api/chats — 새 Chat + 첫 Question. */
export async function postChat(request: Request, response: Response): Promise<void> {
  const parsed = CreateChatRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "VALIDATION_ERROR", "message는 1~1000자여야 합니다.");
    return;
  }
  try {
    const result = await service.createChatWithFirstQuestion(
      clientFor(request),
      parsed.data.message,
    );
    response.status(201).json(result);
  } catch (error) {
    handle(response, error);
  }
}

/** POST /api/chats/:chatId/questions — 다음 Question. */
export async function postQuestion(request: Request, response: Response): Promise<void> {
  const chatId = uuidSchema.safeParse(request.params.chatId);
  if (!chatId.success) {
    sendError(response, 400, "VALIDATION_ERROR", "chatId 형식이 올바르지 않습니다.");
    return;
  }
  const parsed = CreateQuestionRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "VALIDATION_ERROR", "message는 1~1000자여야 합니다.");
    return;
  }
  try {
    const question = await service.createNextQuestion(
      clientFor(request),
      chatId.data,
      parsed.data.message,
    );
    response.status(201).json({ question });
  } catch (error) {
    handle(response, error);
  }
}

/** PATCH /api/chats/:chatId/questions/:questionId — 완료 전이. */
export async function patchQuestion(request: Request, response: Response): Promise<void> {
  const chatId = uuidSchema.safeParse(request.params.chatId);
  const questionId = uuidSchema.safeParse(request.params.questionId);
  if (!chatId.success || !questionId.success) {
    sendError(response, 400, "VALIDATION_ERROR", "id 형식이 올바르지 않습니다.");
    return;
  }
  const parsed = UpdateQuestionStatusRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "VALIDATION_ERROR", "status는 'completed'만 허용됩니다.");
    return;
  }
  try {
    const question = await service.completeQuestion(
      clientFor(request),
      chatId.data,
      questionId.data,
    );
    response.status(200).json({ question });
  } catch (error) {
    handle(response, error);
  }
}

/** GET /api/chats — Chat 목록. */
export async function getChats(request: Request, response: Response): Promise<void> {
  try {
    const chats = await service.listChats(clientFor(request));
    response.status(200).json({ chats });
  } catch (error) {
    handle(response, error);
  }
}

/** GET /api/chats/:chatId/questions — 특정 Chat의 Question 목록. */
export async function getQuestions(request: Request, response: Response): Promise<void> {
  const chatId = uuidSchema.safeParse(request.params.chatId);
  if (!chatId.success) {
    sendError(response, 400, "VALIDATION_ERROR", "chatId 형식이 올바르지 않습니다.");
    return;
  }
  try {
    const questions = await service.listQuestions(clientFor(request), chatId.data);
    response.status(200).json({ questions });
  } catch (error) {
    handle(response, error);
  }
}
