// 정확도 측정(#13)용 샘플 추출. 5개 소스에서 균등하게 4건씩(총 20건) 뽑아, 사람이 정답(gold)을
// 직접 채울 빈 칸이 있는 JSON을 만든다. 이 스크립트는 "무엇을 뽑을지"만 하고, 정답 채우기는 사람 몫이다.
//   node scripts/sample-for-gold.js
import "dotenv/config";
import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const PER_SOURCE = 4;
const SOURCES = ["콘테스트코리아", "링커리어", "위비티", "부산청년플랫폼", "온통청년"];

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// 코드가 뽑은 값(현재 eligibility)에서, 사람이 gold를 채울 때 참고할 필드만 추린다.
function currentExtracted(eligibility) {
  return {
    grades: eligibility?.grades ?? [],
    majors: eligibility?.majors ?? [],
    regions: eligibility?.regions ?? [],
    enrollment: eligibility?.enrollment ?? [],
    ageMin: eligibility?.ageMin ?? null,
    ageMax: eligibility?.ageMax ?? null,
    forUniv: eligibility?.forUniv ?? null,
  };
}

// 사람이 채울 빈 정답칸. "?"는 "아직 안 채움" 표시다 - null은 나이 등에서 "진짜 무관"이라는 유효한
// 답이라 겹치면 안 되고, 그래서 값이 없다는 표시로 null 대신 "?"를 쓴다(채점 스크립트가 "?"만 건너뜀).
function emptyGold() {
  return { grades: "?", majors: "?", regions: "?", enrollment: "?", ageMin: "?", ageMax: "?", forUniv: "?" };
}

async function run() {
  const sample = [];
  for (const source of SOURCES) {
    const { data, error } = await supabase
      .from("postings")
      .select("id, title, org, url, deadline, eligibility")
      .eq("source", source)
      .limit(PER_SOURCE);
    if (error) throw error;
    if (data.length < PER_SOURCE) {
      console.log(`경고: ${source}는 ${data.length}건뿐(${PER_SOURCE}건 요청). 있는 만큼만 담는다.`);
    }
    for (const row of data) {
      sample.push({
        id: row.id,
        source,
        title: row.title,
        org: row.org,
        url: row.url,
        deadline: row.deadline,
        참고_원문: row.eligibility?.text || "(원문 없음 - url로 직접 확인)",
        코드가_뽑은값: currentExtracted(row.eligibility),
        gold: emptyGold(),
      });
    }
  }
  writeFileSync("gold/sample.json", JSON.stringify(sample, null, 2), "utf-8");
  console.log(`${sample.length}건 저장됨 (gold/sample.json). 소스별: ${SOURCES.map((s) => `${s} ${sample.filter((x) => x.source === s).length}건`).join(", ")}`);
  console.log("다음: gold/sample.json을 열어 각 항목의 gold 칸을 직접 채워라(참고_원문·url을 보고 판단).");
}

run().catch((e) => { console.error("샘플 추출 실패:", e.message); process.exit(1); });
