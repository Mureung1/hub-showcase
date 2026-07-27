// LLM(Gemini)으로 아직 안 파싱한 크롤 공고의 자유문장 본문에서 학년·전공·재학요건 + 애매한 분류를 채운다.
// 규칙이 못 채우는 자리(자유문장에만 있는 제한)를 LLM이 메워 조건검색이 실제로 되게 하는 게 목적이다.
//
// 안전/비용:
//  - eligibility.rawText가 있고 아직 llmParsed가 아닌 것만 (한 번 파싱한 건 다시 안 돌림 = 무료 한도 절약).
//  - extract.js의 실행당 콜 상한(MAX_CALLS_PER_RUN)에 걸리면 멈추고 남은 건 다음 실행으로.
//  - 15 RPM(무료 한도) 지키려 호출 간 간격을 준다.
//  - 지역은 LLM 값을 안 쓴다. 규칙(deriveRegionFromDistrict)이 canonical로 더 정확해서 기존 값을 유지한다.
//   node scripts/parse-new.js               (콘코, 최대 200건)
//   node scripts/parse-new.js 위비티 50      (소스·개수 지정)
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import { parse, resetBudget, getBudgetStatus } from "../parser/extract.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RPM_DELAY = 4500; // 분당 15콜 무료 한도 여유

export async function parseNew(supabase, { source = "콘테스트코리아", limit = 200 } = {}) {
  resetBudget();
  const { data, error } = await supabase
    .from("postings")
    .select("id,title,category,track,parse_status,eligibility")
    .eq("source", source)
    .not("eligibility->>rawText", "is", null)
    .limit(limit);
  if (error) throw error;
  const todo = (data || []).filter((r) => r.eligibility?.rawText && !r.eligibility?.llmParsed);

  let parsed = 0, review = 0, reclassified = 0, budgetStop = false;
  for (const r of todo) {
    const res = await parse(r.title, r.eligibility.rawText);
    if (res.isBudgetStop) { budgetStop = true; break; } // 콜 상한 도달, 남은 건 다음 실행
    const e = { ...r.eligibility, llmParsed: true };
    const update = { eligibility: e };

    if (res.track === "scholarship") {
      // LLM이 애매한 장학을 잡음(제목에 '장학' 없어도). 분류만 바꾸고 자격추출은 장학 스키마 밖이라 보류.
      if (r.category !== "장학") { update.category = "장학"; update.track = "scholarship"; reclassified++; }
    } else if (res.parseStatus !== "needs_review" && res.eligibility) {
      // 학년·전공·재학만 LLM에서 채운다. 지역은 규칙 값 유지(LLM 지역은 canonical 아님).
      e.grades = res.eligibility.grades;
      e.majors = res.eligibility.majors;
      e.enrollment = res.eligibility.enrollment;
      update.parse_status = "curated";
      parsed++;
    } else {
      review++; // 확신 낮음 등은 확인 필요로
    }

    const { error: uErr } = await supabase.from("postings").update(update).eq("id", r.id);
    if (uErr) throw uErr;
    await sleep(RPM_DELAY);
  }
  return { candidates: todo.length, parsed, reclassified, review, budgetStop, budget: getBudgetStatus() };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const source = process.argv[2] || "콘테스트코리아";
  const limit = Number(process.argv[3]) || 200;
  const r = await parseNew(supabase, { source, limit });
  console.log(`[${source}] LLM 파싱: 대상 ${r.candidates}건 -> 자격채움 ${r.parsed}, 장학재분류 ${r.reclassified}, 확인필요 ${r.review}`);
  console.log(r.budgetStop ? `콜 상한 도달로 중단(${JSON.stringify(r.budget)}). 다시 실행하면 이어서.` : `완료. ${JSON.stringify(r.budget)}`);
}
