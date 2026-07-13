// ============================================================
// engine/tune.js — 임계값을 '지어내지' 말고 스윕해서 고른다.
//   정확도 ↑ vs 턴수 ↓ 는 트레이드오프. 파레토 프론티어를 본다.
// ============================================================
import fs from "node:fs";
import { simulate } from "./audit.js";
import { T } from "./policy.js";

const kb = JSON.parse(fs.readFileSync(process.argv[2] ?? "kb/draft/kitchen_odor.json", "utf8"));

const grid = [];
for (const PROPOSE of [0.40, 0.50, 0.60, 0.70])
  for (const GAP of [0.05, 0.10, 0.20])
    for (const MAX_TURNS of [2, 3, 4, 5])
      for (const MIN_GAIN of [0.03, 0.08, 0.15])
        grid.push({ ...T, PROPOSE, GAP, MAX_TURNS, MIN_GAIN });

const rows = grid.map((T_) => {
  const s = simulate(kb, { runs: 60, seed: 11, T_, tau: 0.35 });   // 또렷한 사용자
  const m = simulate(kb, { runs: 60, seed: 11, T_, tau: 1.0 });    // 보통 사용자
  const worst = Math.min(...Object.values(s.per).map((p) => p.acc));  // ★ 최악 원인
  return { T_, acc: s.acc, accMid: m.acc, turns: s.avgTurns, worst };
});

// 목적함수: 정확도 - 턴 페널티. 그리고 '최악 원인'이 0인 KB는 배제.
const objective = (r) => r.acc - 0.05 * r.turns + 0.30 * r.worst;

rows.sort((a, b) => objective(b) - objective(a));

console.log(`\n임계값 스윕 (${grid.length}조합) — 상위 12\n`);
console.log("PROPOSE  GAP  MAXT MIN_GAIN | acc(또렷) acc(보통) 턴   최악원인 | 점수");
console.log("─".repeat(78));
for (const r of rows.slice(0, 12)) {
  const t = r.T_;
  console.log(
    `  ${t.PROPOSE.toFixed(2)}  ${t.GAP.toFixed(2)}   ${t.MAX_TURNS}    ${t.MIN_GAIN.toFixed(2)}  |` +
    `  ${(r.acc*100).toFixed(0).padStart(3)}%    ${(r.accMid*100).toFixed(0).padStart(3)}%   ${r.turns.toFixed(2)}` +
    `   ${(r.worst*100).toFixed(0).padStart(3)}%   | ${objective(r).toFixed(3)}`
  );
}

console.log(`\n현재 기본값:`);
const cur = rows.find(r => r.T_.PROPOSE===0.60 && r.T_.GAP===0.20 && r.T_.MAX_TURNS===3 && r.T_.MIN_GAIN===0.15);
console.log(`  0.60  0.20   3    0.15  |  ${(cur.acc*100).toFixed(0)}%    ${(cur.accMid*100).toFixed(0)}%   ${cur.turns.toFixed(2)}   ${(cur.worst*100).toFixed(0)}%   | ${objective(cur).toFixed(3)}`);

const best = rows[0].T_;
console.log(`\n✅ 추천: PROPOSE=${best.PROPOSE} GAP=${best.GAP} MAX_TURNS=${best.MAX_TURNS} MIN_GAIN=${best.MIN_GAIN}`);
