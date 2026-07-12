import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";

const app = express();

app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Recipebook API is running",
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
      success: false,
      message: "서버 내부 오류가 발생했습니다.",
    });
  },
);

export default app;

// express 애플리케이션 구성
// server와 분리하여 나중에 테스트할 때
// 서버를 직접 실행하지 않고 app만 가져올 수 있어 편함