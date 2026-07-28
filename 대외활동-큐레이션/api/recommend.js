// Vercel 서버리스 함수. 배포된 앱에서 자연어 추천을 처리한다. 로컬 개발은 server/api-server.js가
// 같은 역할을 하고, 둘 다 server/recommend.js의 recommend()를 공유한다. 키(GEMINI/SUPABASE)는
// Vercel 환경변수에만 두고 절대 프론트로 안 내보낸다(VITE_ 접두사 안 붙임 = 브라우저 노출 안 됨).
// 프론트와 같은 도메인에서 /api/recommend로 호출되니 CORS 설정이 필요 없다.
import { createClient } from "@supabase/supabase-js";
import { recommend } from "../server/recommend.js";

// 웜 재사용을 위해 지연 생성 후 캐싱한다.
let _supabase;
const getSupabase = () => (_supabase ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 됩니다" });
  const { prompt } = req.body || {};
  if (!prompt || !prompt.trim()) return res.status(400).json({ error: "prompt가 비었어요" });
  try {
    const { profile, candidateCount, results } = await recommend(prompt, getSupabase());
    res.status(200).json({ profile, candidateCount, results: results.map((r) => ({ id: r.id, reason: r.reason })) });
  } catch (e) {
    console.error("추천 실패:", e.message);
    res.status(500).json({ error: e.message });
  }
}
