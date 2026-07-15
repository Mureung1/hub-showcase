import express from "express";
import cron from "node-cron";
import { weatherRouter } from "./routes/weather";
import { salesRouter } from "./routes/sales";
import { proposalRouter } from "./routes/proposal";
import { runDailyProposalJob } from "./jobs/daily";

const app = express();
const PORT = 4000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "weatherpilot-server" });
});

app.use("/weather", weatherRouter);
app.use("/sales", salesRouter);
app.use("/proposal", proposalRouter);

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
