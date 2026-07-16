import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";

import recipesRouter from "./routes/recipes.routes.js";
import { requireFirebaseAuth } from "./middlewares/requireFirebaseAuth.js";
import authRouter from "./routes/auth.routes.js";

const app = express();

app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    data: {
      message: "Recipebook API is running",
    },
  });
});

app.use("/api/auth", authRouter);
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
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
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
