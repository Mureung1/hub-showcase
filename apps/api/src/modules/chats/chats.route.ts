import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware.js";
import {
  postChat,
  postQuestion,
  patchQuestion,
  getChats,
  getQuestions,
} from "./chats.controller.js";
import {
  getSourceAnswers,
  postSourceAnswers,
} from "../sourceAnswers/sourceAnswers.controller.js";
import {
  getAgendas,
  patchAgenda,
} from "../agendas/agendas.controller.js";
import { getFinalAnswer } from "../finalAnswers/finalAnswers.controller.js";

/**
 * Chat·Question 라우트 (SPEC-DB-001 5장). 전부 requireAuth(JWT 검증) 뒤에 둔다.
 */
export const chatsRouter = Router();

chatsRouter.use(requireAuth);

chatsRouter.get("/", getChats);
chatsRouter.post("/", postChat);
chatsRouter.get("/:chatId/questions", getQuestions);
chatsRouter.post("/:chatId/questions", postQuestion);
chatsRouter.patch("/:chatId/questions/:questionId", patchQuestion);

// SPEC-AI-001 4장 — 생성 시작(SSE 스트림) / 새로고침 복원 스냅샷
chatsRouter.post(
  "/:chatId/questions/:questionId/source-answers",
  postSourceAnswers,
);
chatsRouter.get(
  "/:chatId/questions/:questionId/source-answers",
  getSourceAnswers,
);

// SPEC-AI-002 §12.3·§12.4 — 새로고침 복원 스냅샷 / 사용자 판단(채택·직접 입력·제외)
chatsRouter.get("/:chatId/questions/:questionId/agendas", getAgendas);
chatsRouter.patch(
  "/:chatId/questions/:questionId/agendas/:agendaId",
  patchAgenda,
);

// SPEC-AI-003 §8.1 — 폴링과 새로고침 복원이 같은 경로를 쓴다.
chatsRouter.get(
  "/:chatId/questions/:questionId/final-answer",
  getFinalAnswer,
);
