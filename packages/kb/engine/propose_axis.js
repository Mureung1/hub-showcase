// ============================================================
// engine/propose_axis.js — 축 후보를 '추가하기 전에' 평가한다.
//
//   좋은 판별 축의 조건:
//     ① 목표 쌍의 D_JS 를 올린다
//     ② 다른 쌍을 망가뜨리지 않는다 (부작용)
//     ③ cost 가 낮다 (탭으로 답 가능)
//     ④ ★ 사용자가 실제로 답할 수 있다 (수학이 못 재는 것 — 사람이 판단)
//
//   ①②③은 여기서 잰다. ④는 당신이 판단한다.
// ============================================================
import fs from "node:fs";
import { confusionMatrix, separation, totalSeparation } from "./confusion.js";
import { infoGain, entropy, normalize } from "./core.js";
import { simulate } from "./audit.js";

const kb = JSON.parse(fs.readFileSync("kb/draft/kitchen_odor.json", "utf8"));

// ── 후보 축들 ───────────────────────────────────────────
// L 값은 5단계만: 0.90 확실 / 0.70 잘남 / 0.50 중립(생략) / 0.25 드묾 / 0.05 거의없음
const CANDIDATES = [
  {
    id: "sponge_smell",
    question: "수세미나 행주를 코에 대보면 냄새가 나나요?",
    cost: 1.0,
    rationale: "배수구↔수세미 판별. 물리적 차이: 수세미는 '젖어 마르는 물건', 배수구는 '물이 흐르는 구멍'",
    options: {
      yes:         { label: "네, 수세미에서 나요",
                     L: { sponge_dishcloth: 0.90, drain_organic: 0.05, mold_under_sink: 0.05,
                          trap_dry: 0.05, food_waste: 0.25, fridge_spoiled: 0.05 } },
      no:          { label: "아뇨, 수세미는 괜찮아요",
                     L: { sponge_dishcloth: 0.05, drain_organic: 0.70, mold_under_sink: 0.70,
                          trap_dry: 0.70, food_waste: 0.70, fridge_spoiled: 0.70 } },
      unspecified: { label: "확인 안 해봤어요", L: {} },
    },
  },
  {
    id: "fridge_open_test",
    question: "냉장고 문을 열면 냄새가 더 심해지나요?",
    cost: 1.0,
    rationale: "음식물↔냉장고 판별. 냉장고는 '닫힌 저온 부패' — 열 때만 확 남",
    options: {
      worse:       { label: "네, 열면 확 나요",
                     L: { fridge_spoiled: 0.90, food_waste: 0.05, drain_organic: 0.05,
                          trap_dry: 0.05, mold_under_sink: 0.05, sponge_dishcloth: 0.05 } },
      same:        { label: "아뇨, 별 차이 없어요",
                     L: { fridge_spoiled: 0.05, food_waste: 0.70, drain_organic: 0.70,
                          trap_dry: 0.70, mold_under_sink: 0.70, sponge_dishcloth: 0.70 } },
      unspecified: { label: "확인 안 해봤어요", L: {} },
    },
  },
  {
    id: "trash_lid_test",
    question: "쓰레기통 뚜껑을 열면 냄새가 더 심해지나요?",
    cost: 1.0,
    rationale: "음식물↔냉장고 판별 (반대 방향). fridge_open_test와 중복 가능성 — 검증 필요",
    options: {
      worse:       { label: "네, 열면 확 나요",
                     L: { food_waste: 0.90, fridge_spoiled: 0.05, drain_organic: 0.25,
                          trap_dry: 0.05, mold_under_sink: 0.05, sponge_dishcloth: 0.25 } },
      same:        { label: "아뇨, 별 차이 없어요",
                     L: { food_waste: 0.05, fridge_spoiled: 0.70, drain_organic: 0.70,
                          trap_dry: 0.70, mold_under_sink: 0.70, sponge_dishcloth: 0.70 } },
      unspecified: { label: "확인 안 해봤어요", L: {} },
    },
  },
  {
    id: "water_run_test",
    question: "물을 세게 틀면 냄새가 잠깐 더 심해지나요?",
    cost: 1.0,
    rationale: "배수구↔수세미 대안. 배수구는 물 흐를 때 가스가 밀려 올라옴",
    options: {
      worse:       { label: "네, 물 틀면 더 나요",
                     L: { drain_organic: 0.90, trap_dry: 0.25, sponge_dishcloth: 0.05,
                          mold_under_sink: 0.25, food_waste: 0.05, fridge_spoiled: 0.05 } },
      better:      { label: "아뇨, 오히려 줄어요",
                     L: { trap_dry: 0.90, drain_organic: 0.25, sponge_dishcloth: 0.25,
                          mold_under_sink: 0.05, food_waste: 0.05, fridge_spoiled: 0.05 } },
      same:        { label: "차이 없어요",
                     L: { drain_organic: 0.25, trap_dry: 0.05, sponge_dishcloth: 0.70,
                          mold_under_sink: 0.70, food_waste: 0.70, fridge_spoiled: 0.70 } },
      unspecified: { label: "확인 안 해봤어요", L: {} },
    },
  },
];

// ── 평가 ────────────────────────────────────────────────
const ids = Object.keys(kb.hypotheses);
const prior = normalize(Object.fromEntries(
  Object.entries(kb.hypotheses).map(([k, v]) => [k, v.prior])
));
const baseMatrix = confusionMatrix(kb);
const baseMap = Object.fromEntries(baseMatrix.map(p => [`${p.a}|${p.b}`, p.total]));
const baseSim = simulate(kb, { runs: 150, seed: 3, tau: 0.35 });
const baseWorst = Math.min(...Object.values(baseSim.per).map(p => p.acc));

console.log(`\n기준 KB: 정확도 ${(baseSim.acc*100).toFixed(1)}% / 최악원인 ${(baseWorst*100).toFixed(0)}%`);
console.log(`취약 쌍 (D_JS < 0.35): ${baseMatrix.filter(p=>p.total<0.35).length}개\n`);
console.log("═".repeat(94));
console.log("후보 축              IG    정확도    최악원인   취약쌍   목표쌍 개선          부작용");
console.log("═".repeat(94));

const results = [];
for (const cand of CANDIDATES) {
  const kb2 = structuredClone(kb);
  kb2.observables.push(cand);

  const ig = infoGain(prior, cand);
  const m2 = confusionMatrix(kb2);
  const sim2 = simulate(kb2, { runs: 150, seed: 3, tau: 0.35 });
  const worst2 = Math.min(...Object.values(sim2.per).map(p => p.acc));
  const weak2 = m2.filter(p => p.total < 0.35).length;

  // 목표 쌍(원래 취약했던) 개선폭
  const improved = m2
    .map(p => ({ ...p, delta: p.total - (baseMap[`${p.a}|${p.b}`] ?? 0) }))
    .filter(p => (baseMap[`${p.a}|${p.b}`] ?? 1) < 0.35)
    .sort((a,b) => b.delta - a.delta);
  const gain = improved[0];

  // 부작용: 원래 멀쩡했는데 나빠진 쌍 (JS는 축 추가 시 단조증가 → 이론상 0)
  const harmed = m2.filter(p => p.total < (baseMap[`${p.a}|${p.b}`] ?? 0) - 1e-9).length;

  results.push({ cand, ig, acc: sim2.acc, worst: worst2, weak: weak2, gain, harmed });

  console.log(
    `${cand.id.padEnd(20)} ${ig.toFixed(3)}  ` +
    `${(sim2.acc*100).toFixed(1)}%${sim2.acc>baseSim.acc?"↑":"↓"}  ` +
    `${(worst2*100).toFixed(0).padStart(3)}%${worst2>baseWorst?"↑":" "}    ` +
    `${weak2}${weak2<baseMatrix.filter(p=>p.total<0.35).length?"↓":" "}      ` +
    `${gain ? `+${gain.delta.toFixed(2)} (${kb.hypotheses[gain.a].label.slice(0,6)}↔${kb.hypotheses[gain.b].label.slice(0,6)})`.padEnd(22) : "—".padEnd(22)} ` +
    `${harmed===0 ? "없음" : harmed+"쌍 악화"}`
  );
}
console.log("═".repeat(94));

// ── 조합 평가: 상위 2개를 같이 넣으면? ────────────────────
console.log("\n■ 조합 (중복 여부 확인)\n");
const combos = [
  ["sponge_smell", "fridge_open_test"],
  ["sponge_smell", "trash_lid_test"],
  ["water_run_test", "fridge_open_test"],
  ["sponge_smell", "fridge_open_test", "water_run_test"],
];
for (const combo of combos) {
  const kb2 = structuredClone(kb);
  for (const id of combo) kb2.observables.push(CANDIDATES.find(c => c.id === id));
  const s = simulate(kb2, { runs: 150, seed: 3, tau: 0.35 });
  const sMid = simulate(kb2, { runs: 150, seed: 3, tau: 1.0 });
  const w = Math.min(...Object.values(s.per).map(p => p.acc));
  const weak = confusionMatrix(kb2).filter(p => p.total < 0.35).length;
  console.log(
    `${combo.join(" + ").padEnd(52)} acc ${(s.acc*100).toFixed(1)}% (τ=1: ${(sMid.acc*100).toFixed(0)}%)` +
    `  최악 ${(w*100).toFixed(0)}%  턴 ${s.avgTurns.toFixed(2)}  취약쌍 ${weak}`
  );
}

fs.writeFileSync("kb/candidates.json", JSON.stringify(CANDIDATES, null, 2));
console.log("\n💾 kb/candidates.json");
