import express from "express";
import cron from "node-cron";
import { weatherRouter } from "./routes/weather";
import { salesRouter } from "./routes/sales";
import { proposalRouter } from "./routes/proposal";
import { campaignsRouter } from "./routes/campaigns";
import { couponsRouter } from "./routes/coupons";
import { runDailyProposalJob } from "./jobs/daily";

const app = express();
const PORT = 4000;

app.use(express.json());

// CORS — 웹(Vite)에서 실연동(MOCK_MODE=off) 시 필요.
// 허용 오리진은 CORS_ORIGINS(콤마 구분) 또는 기본 로컬 Vite. 배포 시 화이트리스트로 좁힌다(백로그 4-3).
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(",");
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "weatherpilot-server" });
});

app.use("/weather", weatherRouter);
app.use("/sales", salesRouter);
app.use("/proposal", proposalRouter);
app.use("/campaigns", campaignsRouter);
app.use("/coupons", couponsRouter);

// 매일 06:30(KST) 자동 제안 잡 — 예상 하락 -20%↑인 날만 발동
cron.schedule(
  "30 6 * * *",
  () => {
    runDailyProposalJob().catch((e) =>
      console.error("[daily] 실패:", e instanceof Error ? e.message : e),
    );
  },
  { timezone: "Asia/Seoul" },
);

app.listen(PORT, () => {
  console.log(`server on http://localhost:${PORT}`);
});
