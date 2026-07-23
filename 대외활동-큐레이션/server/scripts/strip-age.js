// 일회성 마이그레이션: postings의 eligibility JSONB에서 나이(ageMin/ageMax) 키를 제거한다.
// 나이는 매칭에서 안 쓰기로 해서(제품 결정) DB에 남은 흔적도 지운다. 네트워크가 가끔 끊겨 재시도를 둔다.
//   node scripts/strip-age.js
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function updateWithRetry(id, e, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const { error } = await s.from("postings").update({ eligibility: e }).eq("id", id);
    if (!error) return true;
    await sleep(500 * (i + 1)); // 점점 길게 기다렸다 재시도
  }
  return false;
}

async function run() {
  let all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s.from("postings").select("id,eligibility").range(from, from + 999);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  const targets = all.filter((r) => r.eligibility && ("ageMin" in r.eligibility || "ageMax" in r.eligibility));
  console.log(`전체 ${all.length}건, 나이 남은 것 ${targets.length}건 처리 시작`);

  let done = 0, failed = 0;
  for (const r of targets) {
    const e = { ...r.eligibility };
    delete e.ageMin;
    delete e.ageMax;
    const ok = await updateWithRetry(r.id, e);
    ok ? done++ : failed++;
    if ((done + failed) % 500 === 0) console.log(`  ...${done + failed}/${targets.length} (실패 ${failed})`);
    await sleep(20); // 서버 부담 완화
  }
  console.log(`완료: 성공 ${done}건, 실패 ${failed}건`);
}

run().catch((e) => { console.error("마이그레이션 실패:", e.message); process.exit(1); });
