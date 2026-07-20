import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware.js";
import {
  postChat,
  postQuestion,
  patchQuestion,
  getChats,
  getQuestions,
} from "./chats.controller.js";

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
