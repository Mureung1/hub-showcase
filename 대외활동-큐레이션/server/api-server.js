// 자연어 추천용 로컬 API 서버. 프론트(정적 SPA)는 Gemini 키를 가질 수 없으니(공개되면 유출) 이 서버가
// 키를 들고 대신 호출한다. 새 의존성 없이 Node 내장 http만 쓴다. POST /api/recommend {prompt} -> 추천.
// 배포 때는 이 핸들러를 Vercel 서버리스 함수로 감싸면 된다(키는 서버 env 그대로).
//   node api-server.js   (기본 포트 8787)
import "dotenv/config";
import { createServer } from "http";
import { createClient } from "@supabase/supabase-js";
import { recommend } from "./recommend.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const PORT = process.env.RECOMMEND_PORT || 8787;

function send(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",              // 로컬 개발용(프론트가 다른 포트라 CORS 허용)
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method !== "POST" || !req.url.startsWith("/api/recommend")) return send(res, 404, { error: "not found" });

  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", async () => {
    try {
      const { prompt } = JSON.parse(raw || "{}");
      if (!prompt || !prompt.trim()) return send(res, 400, { error: "prompt가 비었어요" });
      const { profile, candidateCount, results } = await recommend(prompt, supabase);
      // 프론트는 이미 전체 공고를 갖고 있으니 id+이유만 돌려주면 화면에서 카드로 매핑한다.
      send(res, 200, { profile, candidateCount, results: results.map((r) => ({ id: r.id, reason: r.reason })) });
    } catch (e) {
      console.error("추천 실패:", e.message);
      send(res, 500, { error: e.message });
    }
  });
}).listen(PORT, () => console.log(`추천 API: http://localhost:${PORT}/api/recommend`));
