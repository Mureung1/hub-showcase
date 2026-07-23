import cors from "cors";
import express from "express";

import { healthRouter } from "./modules/health/health.route.js";
import { authRouter } from "./modules/auth/auth.route.js";
import { chatsRouter } from "./modules/chats/chats.route.js";
import { loadEnv } from "./shared/config/env.js";

export const app = express();

/**
 * CORS는 프론트 출처(CLIENT_ORIGIN)만 허용한다 (T-017 배포 하드닝).
 * - 로컬 dev는 기본값 http://localhost:5173 이라 별도 설정 없이 그대로 동작한다.
 * - 배포 시 Render env의 CLIENT_ORIGIN을 Netlify 주소로 지정한다.
 * - 인증은 Authorization: Bearer 헤더로만 하고 쿠키를 쓰지 않으므로 credentials는 켜지 않는다.
 */
app.use(cors({ origin: loadEnv().CLIENT_ORIGIN }));
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/chats", chatsRouter);