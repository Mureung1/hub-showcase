import "dotenv/config";
import express from "express";
import { handleCalculateSchedule } from "./routes/scheduleCalculate.js";

const app = express();
const port = process.env.PORT ?? 4000;

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
