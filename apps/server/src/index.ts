import express from "express";
import cron from "node-cron";
import { weatherRouter } from "./routes/weather";
import { salesRouter } from "./routes/sales";
import { proposalRouter } from "./routes/proposal";
import { campaignsRouter } from "./routes/campaigns";
import { couponsRouter } from "./routes/coupons";
import { runDailyProposalJob, runBootProposalJob, JOB_TIME_KST } from "./jobs/daily";

const app = express();
// Render/Railway 등 호스팅은 PORT를 주입한다. 로컬은 4000 폴백.
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(express.json());

// CORS — 웹(Vite)에서 실연동(MOCK_MODE=off) 시 필요.
// 허용 오리진은 CORS_ORIGINS(콤마 구분) 또는 기본 로컬 Vite. 배포 시 화이트리스트로 좁힌다(백로그 4-3).
const CORS_ORIGINS = (
  process.env.CORS_ORIGINS ?? "http://localhost:5173,https://weatherpilot-web.vercel.app"
).split(",");
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

// 매일 06:30(KST) 자동 제안 잡 — 예상 하락 -20%↑인 날만 발동 + 사장님 문자.
// 원설계 유지용(상시 서버 가정) — 무료 플랜에선 06:30에 서버가 꺼져 있어
// 실질 생성은 아래 기동 잡(runBootProposalJob)이 담당한다.
cron.schedule(
  `${JOB_TIME_KST.minute} ${JOB_TIME_KST.hour} * * *`,
  () => {
    runDailyProposalJob().catch((e) =>
      console.error("[daily] 실패:", e instanceof Error ? e.message : e),
    );
  },
  { timezone: "Asia/Seoul" },
);

app.listen(PORT, () => {
  console.log(`server on http://localhost:${PORT}`);
  // 기동 잡 — 켠 시점에 오늘 제안을 자동 생성한다 (이미 있으면 스킵, 실패해도 서버는 계속)
  runBootProposalJob()
    .then((r) => {
      if (r.ran) console.log(`[boot] 오늘 제안 생성 — campaign ${r.campaignId}`);
      else console.log("[boot] 오늘 캠페인 이미 있음 — 스킵");
    })
    .catch((e) =>
      console.error("[boot] 기동 잡 실패:", e instanceof Error ? e.message : e),
    );
});
