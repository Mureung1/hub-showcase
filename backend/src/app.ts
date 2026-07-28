import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";

import recipesRouter from "./routes/recipes.routes.js";
import { requireFirebaseAuth } from "./middlewares/requireFirebaseAuth.js";
import authRouter from "./routes/auth.routes.js";
import aiRouter from "./routes/ai.routes.js";
import transferInvitationsRouter from "./routes/transferInvitations.routes.js";

const app = express();
const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN;

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.get("origin");

  if (!allowedOrigin || origin !== allowedOrigin) {
    next();
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    data: {
      message: "Recipebook API is running",
    },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/ai", requireFirebaseAuth, aiRouter);
app.use("/api", transferInvitationsRouter);
app.use("/api/recipes", requireFirebaseAuth, recipesRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: "API_NOT_FOUND",
      message: "요청한 API를 찾을 수 없습니다.",
    },
  });
});

app.use(
  (
    error: Error & { type?: string },
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    if (error.type === "entity.parse.failed") {
      res.status(400).json({
        error: {
          code: "INVALID_JSON",
          message: "JSON 요청 형식이 올바르지 않습니다.",
        },
      });
      return;
    }

    if (error.type === "entity.too.large") {
      res.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "요청 본문 크기가 제한을 초과했습니다.",
        },
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "서버 내부 오류가 발생했습니다.",
      },
    });
  },
);

export default app;

// express 애플리케이션 구성
// server와 분리하여 나중에 테스트할 때
// 서버를 직접 실행하지 않고 app만 가져올 수 있어 편함
