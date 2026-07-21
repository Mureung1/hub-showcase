import express from "express";

const app = express();
const requestedPort = Number.parseInt(process.env.PORT ?? "", 10);
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3000;

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.use((request, response) => {
  response.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "요청한 경로를 찾을 수 없습니다."
    }
  });
});

app.use((error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    response.status(400).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "올바른 JSON 형식으로 요청해 주세요."
      }
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 내부 오류가 발생했습니다."
    }
  });
});

app.listen(port, () => {
  console.log(`Express server listening on http://localhost:${port}`);
});

export default app;
