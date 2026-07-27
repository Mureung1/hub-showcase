import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleCalculateSchedule } from "./routes/scheduleCalculate.js";

const app = express();
const port = process.env.PORT ?? 4000;

// #31 — 배포 시 FE(Vercel)와 BE(Render)가 다른 출처라 브라우저가 요청을 기본 차단한다.
// 서버가 CORS 허가 헤더를 내려줘야 통과된다. 허용할 출처는 환경마다 다르므로 CLIENT_ORIGIN
// 환경변수로 받는다. 개발에선 이 값을 안 채우므로(프록시라 CORS를 안 타긴 하지만) true로
// 두어 모든 출처를 허용하고, 배포에선 Vercel 주소만 허용하도록 좁힌다.
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? true }));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// #14 "Express 서버에서 .env로 연결이 확인된다" 완료 기준 확인용.
// SUPABASE_URL/SUPABASE_ANON_KEY가 아직 안 채워졌어도 서버 자체는 뜨도록 동적 import로 분리.
app.get("/health/db", async (_req, res) => {
  try {
    const { supabase } = await import("./db/supabaseClient.js");
    const { error } = await supabase.from("sensitivity_halflife").select("id").limit(1);
    if (error) throw error;
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", message: (err as Error).message });
  }
});

// #15 "POST /api/schedule/calculate 엔드포인트" — 서비스_기술_지도.md 7.2
app.post("/api/schedule/calculate", handleCalculateSchedule);

app.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`);
});
