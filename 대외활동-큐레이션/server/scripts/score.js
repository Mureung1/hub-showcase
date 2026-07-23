// gold(사람이 채운 정답) vs 코드가_뽑은값(실제 저장된 eligibility)을 비교해 필드별 정밀도·재현율을 낸다.
// 값은 전부 "집합"으로 본다 - 배열 필드는 그대로, 스칼라 필드(ageMin 등)는 값이 있으면 원소 1개짜리 집합,
// null(무관)이면 빈 집합. 이렇게 하면 배열·스칼라를 같은 식으로 채점할 수 있다.
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const FIELDS = ["grades", "majors", "regions", "enrollment", "forUniv"];

function toSet(value) {
  if (value == null) return new Set();
  if (Array.isArray(value)) return new Set(value);
  return new Set([value]);
}

// items: [{ 코드가_뽑은값: {...}, gold: {...} }]. gold[field]가 "?"(미채점)면 그 항목은 그 필드 채점에서 뺀다.
export function scoreEligibility(items) {
  const result = {};
  for (const field of FIELDS) {
    let tp = 0, fp = 0, fn = 0, labeled = 0;
    for (const item of items) {
      const goldRaw = item.gold?.[field];
      if (goldRaw === "?" || goldRaw === undefined) continue;
      labeled++;
      const predicted = toSet(item.코드가_뽑은값?.[field]);
      const gold = toSet(goldRaw);
      for (const v of predicted) { if (gold.has(v)) tp++; else fp++; }
      for (const v of gold) { if (!predicted.has(v)) fn++; }
    }
    result[field] = {
      precision: tp + fp === 0 ? null : tp / (tp + fp),
      recall: tp + fn === 0 ? null : tp / (tp + fn),
      labeled,
    };
  }
  return result;
}

// 직접 실행: gold/sample.json(사람이 라벨링 끝낸 파일)을 읽어 실제 채점 결과를 찍는다.
//   node scripts/score.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const items = JSON.parse(readFileSync(new URL("../gold/sample.json", import.meta.url), "utf-8"));
  const totalLabeled = items.filter((it) => Object.values(it.gold).some((v) => v !== "?")).length;
  if (totalLabeled === 0) {
    console.log("gold/sample.json에 아직 라벨링된 항목이 없다. gold 칸을 채운 뒤 다시 실행하라.");
  } else {
    const result = scoreEligibility(items);
    console.log(`gold/sample.json ${items.length}건 중 라벨링된 필드 기준 채점 결과:\n`);
    for (const [field, r] of Object.entries(result)) {
      const fmt = (n) => (n == null ? "-" : (n * 100).toFixed(0) + "%");
      console.log(`  ${field}: 정밀도 ${fmt(r.precision)} / 재현율 ${fmt(r.recall)} (라벨링 ${r.labeled}건)`);
    }
  }
}
