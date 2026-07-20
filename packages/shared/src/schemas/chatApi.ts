import { z } from "zod";
import { ChatSchema } from "./chat.js";
import { QuestionSchema } from "./question.js";

/**
 * Chat·Question REST 계약 (SPEC-DB-001 5장). api가 생성·web이 파싱하는 공유 계약.
 * 성공 응답은 최소 형태(엔티티 래핑). 표준 성공 봉투 확정은 이후 데이터 Spec에서.
 * 오류는 SPEC-AUTH-003 에러 봉투를 재사용한다.
 */

/** POST /api/chats — 새 Chat + 첫 Question (title = message 앞 100자, 서버가 자름). */
export const CreateChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
});
export type CreateChatRequest = z.infer<typeof CreateChatRequestSchema>;

export const CreateChatResponseSchema = z.object({
  chat: ChatSchema,
  question: QuestionSchema,
});
export type CreateChatResponse = z.infer<typeof CreateChatResponseSchema>;

/** POST /api/chats/:chatId/questions — 같은 Chat의 다음 Question. */
export const CreateQuestionRequestSchema = z.object({
  message: z.string().min(1).max(1000),
});
export type CreateQuestionRequest = z.infer<typeof CreateQuestionRequestSchema>;

/**
 * PATCH /api/chats/:chatId/questions/:questionId — Question 생명주기 상태 영속화.
 * 이 Spec 범위(AI 생성물 비영속)에서는 완료 전이만 허용한다 — web mock 흐름이
 * DecisionNote 생성 시점에 호출해 미완료 1개 제약·재로그인 복원을 일관되게 한다.
 */
export const UpdateQuestionStatusRequestSchema = z.object({
  status: z.literal("completed"),
});
export type UpdateQuestionStatusRequest = z.infer<
  typeof UpdateQuestionStatusRequestSchema
>;

export const QuestionResponseSchema = z.object({ question: QuestionSchema });
export type QuestionResponse = z.infer<typeof QuestionResponseSchema>;

/** GET /api/chats — Chat 목록(updated_at desc). */
export const ChatListResponseSchema = z.object({
  chats: z.array(ChatSchema),
});
export type ChatListResponse = z.infer<typeof ChatListResponseSchema>;

/** GET /api/chats/:chatId/questions — 특정 Chat의 Question 목록(sequence asc). */
export const QuestionListResponseSchema = z.object({
  questions: z.array(QuestionSchema),
});
export type QuestionListResponse = z.infer<typeof QuestionListResponseSchema>;
