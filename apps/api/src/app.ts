import cors from "cors";
import express from "express";

import { healthRouter } from "./modules/health/health.route.js";
import { authRouter } from "./modules/auth/auth.route.js";
import { chatsRouter } from "./modules/chats/chats.route.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/chats", chatsRouter);