// ============================================================
// engine/confusion.js — "어느 두 원인이 안 갈리는가"를 찾는다.
//
//   D_JS(Pi‖Pj) = ½KL(Pi‖M) + ½KL(Pj‖M),  M = (Pi+Pj)/2
//     0 → 두 원인이 완전히 똑같이 보임 (구분 불가)  ★ KB의 구조적 결함
//     1 → 한 번의 관찰로 완벽 구분
//
//   KL이 아닌 JS를 쓰는 이유: 대칭이고, 0에서 발산 안 하고, [0,1] bit로 유계.
//   튜닝으로는 못 고친다. 정보가 없으면 어떤 알고리즘도 못 만든다. → 축을 추가해야 함.
// ============================================================
import { L_of } from "./core.js";

// 한 관찰항목에서, 원인 H가 주는 답변 분포 P(a|H)
function answerDist(obs, cause) {
  const keys = Object.keys(obs.options).filter((k) => k !== "unspecified");
  const w = keys.map((k) => L_of(obs.options[k].L, cause));
  const s = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / s);   // 정규화 → 진짜 확률분포
}

const KL = (P, M) =>
  P.reduce((s, p, i) => (p > 1e-12 ? s + p * Math.log2(p / Math.max(M[i], 1e-12)) : s), 0);

export function jsDivergence(P, Q) {
  const M = P.map((p, i) => (p + Q[i]) / 2);
  return 0.5 * KL(P, M) + 0.5 * KL(Q, M);
}

// 관찰항목 하나가 두 원인을 얼마나 가르는가
export const separation = (obs, a, b) =>
  jsDivergence(answerDist(obs, a), answerDist(obs, b));

// KB 전체가 두 원인을 얼마나 가르는가 (모든 축의 합 — 조건부독립 가정)
export const totalSeparation = (kb, a, b) =>
  kb.observables.reduce((s, o) => s + separation(o, a, b), 0);

// ── 혼동 행렬: 모든 쌍의 판별력 ───────────────────────────
export function confusionMatrix(kb) {
  const ids = Object.keys(kb.hypotheses);
  const pairs = [];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const total = totalSeparation(kb, ids[i], ids[j]);
      const per = kb.observables.map((o) => ({
        id: o.id, d: separation(o, ids[i], ids[j]),
      })).sort((x, y) => y.d - x.d);
      pairs.push({ a: ids[i], b: ids[j], total, best: per[0], per });
    }
  return pairs.sort((x, y) => x.total - y.total);   // 안 갈리는 순
}

export function confusionReport(kb, { threshold = 0.35 } = {}) {
  const pairs = confusionMatrix(kb);
  const L = [];
  L.push(`## 쌍별 판별력 (Jensen-Shannon divergence, bit)\n`);
  L.push(`| 원인 A | 원인 B | 총 판별력 | 최선 축 | 그 축의 판별력 | 판정 |`);
  L.push(`|---|---|---|---|---|---|`);
  for (const p of pairs) {
    const v = p.total < 0.15 ? "🔴 구분 불가" : p.total < threshold ? "🟠 취약" : "🟢 구분됨";
    L.push(`| ${kb.hypotheses[p.a].label} | ${kb.hypotheses[p.b].label} | **${p.total.toFixed(3)}** | ${p.best.id} | ${p.best.d.toFixed(3)} | ${v} |`);
  }
  const broken = pairs.filter((p) => p.total < threshold);
  if (broken.length) {
    L.push(`\n### 🔧 처방`);
    for (const p of broken) {
      L.push(`- **${kb.hypotheses[p.a].label} ↔ ${kb.hypotheses[p.b].label}** (판별력 ${p.total.toFixed(3)})`);
      L.push(`  - 기존 축 어느 것도 못 가름: ${p.per.map(x => `${x.id}=${x.d.toFixed(2)}`).join(", ")}`);
      L.push(`  - → **이 둘만 가르는 새 축이 필요함**`);
    }
  }
  return L.join("\n");
}
