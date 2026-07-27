// 마감(D-day)이 지난 공고를 DB에서 삭제한다. 지원할 수 없는 공고라 계속 쌓이면 노이즈만 된다.
// collect.js(수집) 끝에서 자동 호출되고, 단독 CLI로도 돌릴 수 있다.
// 안전장치:
//  - deadline이 null인 것(부산청년플랫폼·서울 등 마감일 없는 상시)은 만료가 아니라 절대 안 지운다.
//  - 오늘 마감(deadline == today)은 아직 유효라 남긴다. deadline < today(엄격히 지난 것)만 지운다.
//  - 수집 뒤에 돌려야 방금 받은 유효 공고는 영향 없다(만료된 것만 지우므로).
//   node scripts/purge-expired.js            (dry-run: 개수만)
//   node scripts/purge-expired.js --apply    (실제 삭제)
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";

const todayStr = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD (deadline도 같은 형식이라 문자열 비교 가능)

// 만료 조건: deadline이 있고(null 아님) 오늘보다 이전. 쿼리 빌더에 공통으로 얹는다.
function whereExpired(q, today) {
  return q.lt("deadline", today).not("deadline", "is", null);
}

// 만료 공고를 세고(apply=false) 또는 지운다(apply=true). 소스별 분포를 반환한다.
export async function purgeExpired(supabase, apply = false) {
  const today = todayStr();
  const bySrc = {};
  for (let from = 0; ; from += 1000) {
    const { data, error } = await whereExpired(
      supabase.from("postings").select("source,deadline"), today,
    ).range(from, from + 999);
    if (error) throw error;
    for (const r of data) bySrc[r.source] = (bySrc[r.source] || 0) + 1;
    if (data.length < 1000) break;
  }
  const count = Object.values(bySrc).reduce((a, b) => a + b, 0);
  if (apply && count) {
    const { error } = await whereExpired(supabase.from("postings").delete(), today);
    if (error) throw error;
  }
  return { count, bySrc, applied: apply };
}

// 단독 실행(CLI)일 때만 도는 부분. 경로에 공백이 있어 fileURLToPath로 비교한다(file://+argv 직접 비교는 %20 때문에 실패).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const apply = process.argv.includes("--apply");
  const r = await purgeExpired(supabase, apply);
  console.log(`오늘(${todayStr()}) 기준 만료 공고: ${r.count}건`, JSON.stringify(r.bySrc));
  console.log(apply ? `삭제 완료: ${r.count}건 제거.` : "dry-run입니다. 실제로 지우려면 --apply 를 붙이세요.");
}
