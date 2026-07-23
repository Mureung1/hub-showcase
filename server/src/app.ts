import express from "express";
import tasksRouter from "./routes/tasks.js";
import pushSubscriptionsRouter from "./routes/pushSubscriptions.js";
import historyRouter from "./routes/history.js";

const app = express();

app.use(express.json());

// 로컬 dev(vite proxy)와 Vercel 배포(api/index.js) 양쪽 모두 요청 경로에
// /api 접두사가 붙은 채로 이 앱까지 전달되므로, 라우트도 /api 밑에 마운트한다.
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/tasks", tasksRouter);
app.use("/api/push-subscriptions", pushSubscriptionsRouter);
app.use("/api/history", historyRouter);

export default app;
