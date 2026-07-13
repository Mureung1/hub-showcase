// ============================================================
// engine/audit.js — 수집 에이전트가 가져온 KB를 수학으로 깐다.
//   LLM 없음. API키 없음. 즉시 실행. → M2(심장박동)를 Day2로 당김.
// ============================================================
import { entropy, infoGain, score, bayes, normalize, ranked } from "./core.js";
import { decide, initState, T } from "./policy.js";
import { confusionReport, confusionMatrix } from "./confusion.js";

// ── ① IG 진단: 질문들이 실제로 가설을 가르는가? ──────────────
export function auditQuestions(kb) {
  const prior = normalize(
    Object.fromEntries(Object.entries(kb.hypotheses).map(([k, v]) => [k, v.prior]))
  );
  const H0 = entropy(prior);
  const rows = kb.observables.map((o) => ({
    id: o.id,
    cost: o.cost ?? 1,
    ig: infoGain(prior, o),
    score: score(prior, o),
    nOpts: Object.keys(o.options).length,
  })).sort((a, b) => b.score - a.score);

  const nH = Object.keys(kb.hypotheses).length;
  const Hmax = Math.log2(nH);
  const diag = [];
  if (H0 < 1.5) diag.push("⚠️ 초기 엔트로피 낮음 — prior가 한쪽에 쏠림. 가설 추가 또는 평탄화");
  if (H0 > 2.8) diag.push("⚠️ 초기 엔트로피 높음 — 가설이 너무 많거나 균등. 병합 검토");
  if (rows.every((r) => r.ig < 0.2))
    diag.push("🔴 치명: 모든 질문 IG<0.2 — 우도가 중립(0.5)에 몰려 있음. KB가 무력함");
  const dead = rows.filter((r) => r.ig < T.MIN_GAIN);
  if (dead.length) diag.push(`⚠️ 사문화된 질문 ${dead.length}개 (IG<${T.MIN_GAIN}): ${dead.map(d=>d.id).join(", ")}`);
  if (rows[0]?.ig > 1.5) diag.push("ℹ️ 최상위 질문이 매우 강력 — 1턴에 끝날 수 있음");

  return { H0, Hmax, rows, diag };
}

// ── ② 시뮬레이션: 가상 사용자 ────────────────────────────────
// ★ 순환논법 주의: KB의 우도로 답을 샘플링하면 "KB로 KB를 채점"하게 된다.
//    사용자 온도 τ 로 분리한다:  P_user(a|H) ∝ [P_KB(a|H)]^(1/τ)
//      τ→0 : 이상적 사용자 (정답 축을 정확히 답함)  ← KB 상한 측정
//      τ=1 : KB 우도 그대로 (현재)
//      τ>1 : 혼란한 사용자                          ← KB 하한 측정
//    세 온도를 다 봐야 KB의 실력과 사용자 노이즈가 분리된다.
function sampleAnswer(obs, trueCause, rng, tau = 0.35) {
  const entries = Object.entries(obs.options)
    .filter(([k]) => k !== "unspecified");        // 이상적 사용자는 "모름"을 덜 씀
  if (!entries.length) return Object.entries(obs.options)[0];
  const w = entries.map(([, o]) =>
    Math.pow(Math.min(0.95, Math.max(0.05, o.L?.[trueCause] ?? 0.5)), 1 / tau)
  );
  const sum = w.reduce((a, b) => a + b, 0);
  let x = rng() * sum;
  for (let i = 0; i < entries.length; i++) { x -= w[i]; if (x <= 0) return entries[i]; }
  return entries[entries.length - 1];
}

// 재현 가능한 난수 (mulberry32)
const seeded = (s) => () => {
  s |= 0; s = (s + 0x6D2B79F5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function simulate(kb, { runs = 100, seed = 42, T_ = T, tau = 0.35 } = {}) {
  const rng = seeded(seed);
  const causes = Object.keys(kb.hypotheses);
  const per = {}, all = { hit: 0, n: 0, turns: 0 };

  for (const truth of causes) {
    per[truth] = { hit: 0, n: 0, turns: 0 };
    for (let i = 0; i < runs; i++) {
      const st = initState(kb);
      let d;
      while (true) {
        d = decide(kb, st, T_);
        if (d.move !== "ASK") break;
        const [ansKey, ansObj] = sampleAnswer(d.obs, truth, rng, tau);
        st.posterior = bayes(st.posterior, ansObj.L);
        st.asked.add(d.obs.id);
        st.turn++;
      }
      const top = ranked(st.posterior)[0].id;
      const ok = top === truth;
      per[truth].hit += ok; per[truth].n++; per[truth].turns += st.turn;
      all.hit += ok; all.n++; all.turns += st.turn;
    }
  }
  for (const k of causes) {
    per[k].acc = per[k].hit / per[k].n;
    per[k].avgTurns = per[k].turns / per[k].n;
  }
  return { acc: all.hit / all.n, avgTurns: all.turns / all.n, per };
}

// ── ③ 강건성: 파라미터 ±20% 흔들어도 진단이 그대로인가? ────────
// "당신이 지어낸 숫자"가 결과를 좌우하지 않음을 증명. 발표용 실험.
export function robustness(kb, { noise = 0.2, trials = 30, runs = 30, seed = 7 } = {}) {
  const base = simulate(kb, { runs, seed });
  const accs = [];
  for (let t = 0; t < trials; t++) {
    const rng = seeded(seed + 1000 + t);
    const perturbed = structuredClone(kb);
    for (const h of Object.values(perturbed.hypotheses))
      h.prior *= 1 + (rng() * 2 - 1) * noise;
    for (const o of perturbed.observables)
      for (const opt of Object.values(o.options))
        for (const k of Object.keys(opt.L ?? {}))
          opt.L[k] = Math.min(0.95, Math.max(0.05, opt.L[k] * (1 + (rng() * 2 - 1) * noise)));
    accs.push(simulate(perturbed, { runs, seed: seed + t }).acc);
  }
  const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
  const sd = Math.sqrt(accs.reduce((s, a) => s + (a - mean) ** 2, 0) / accs.length);
  return { baseAcc: base.acc, mean, sd, min: Math.min(...accs), max: Math.max(...accs), noise };
}

// ── ④ 종합 리포트 ────────────────────────────────────────
export function report(kb) {
  const q = auditQuestions(kb);
  const s = simulate(kb, { runs: 200, tau: 0.35 });
  const sMid = simulate(kb, { runs: 200, tau: 1.0 });
  const sBad = simulate(kb, { runs: 200, tau: 2.0 });
  const r = robustness(kb);
  const L = [];
  L.push(`# KB 감사 리포트 — ${kb.domain} v${kb.version ?? "?"}`);
  L.push(`\n## 1. 구조`);
  L.push(`- 가설 ${Object.keys(kb.hypotheses).length}개 / 관찰항목 ${kb.observables.length}개`);
  L.push(`- 초기 엔트로피 H₀ = **${q.H0.toFixed(2)} bit** (최대 ${q.Hmax.toFixed(2)}, 목표대 2.2~2.6)`);
  L.push(`\n## 2. 질문 정보이득 (IG)\n`);
  L.push(`| 질문 | 선택지 | 비용 | IG (bit) | score=IG/cost | 판정 |`);
  L.push(`|---|---|---|---|---|---|`);
  for (const r_ of q.rows) {
    const v = r_.ig >= 0.5 ? "🟢 강력" : r_.ig >= T.MIN_GAIN ? "🟡 유효" : "🔴 사문화";
    L.push(`| ${r_.id} | ${r_.nOpts} | ${r_.cost} | ${r_.ig.toFixed(3)} | ${r_.score.toFixed(3)} | ${v} |`);
  }
  L.push(`\n## 3. 시뮬레이션 (가상 사용자 ${Object.keys(kb.hypotheses).length}×200판)`);
  L.push(`\n사용자 온도 τ = 답변의 정확성. τ→0 이상적, τ=1 KB우도대로, τ=2 혼란함.\n`);
  L.push(`| 사용자 | 정확도 | 평균 턴 | 해석 |`);
  L.push(`|---|---|---|---|`);
  L.push(`| τ=0.35 (또렷) | **${(s.acc*100).toFixed(1)}%** | ${s.avgTurns.toFixed(2)} | KB 실력의 **상한** |`);
  L.push(`| τ=1.0 (보통) | ${(sMid.acc*100).toFixed(1)}% | ${sMid.avgTurns.toFixed(2)} | 현실적 기대치 |`);
  L.push(`| τ=2.0 (혼란) | ${(sBad.acc*100).toFixed(1)}% | ${sBad.avgTurns.toFixed(2)} | 최악 사용자 **하한** |`);
  L.push(`\n| 정답 원인 | 정확도 | 평균 턴 |`);
  L.push(`|---|---|---|`);
  for (const [k, v] of Object.entries(s.per).sort((a,b)=>a[1].acc-b[1].acc))
    L.push(`| ${kb.hypotheses[k].label} | ${(v.acc*100).toFixed(0)}% ${v.acc<0.5?"🔴":""} | ${v.avgTurns.toFixed(1)} |`);
  L.push(`\n## 4. 강건성 (파라미터 ±${r.noise*100}% 섭동 × 30회)`);
  L.push(`- 기준 정확도 ${(r.baseAcc*100).toFixed(1)}% → 섭동 후 **${(r.mean*100).toFixed(1)}% ± ${(r.sd*100).toFixed(1)}%p** (범위 ${(r.min*100).toFixed(0)}~${(r.max*100).toFixed(0)}%)`);
  L.push(r.sd < 0.05
    ? `- ✅ **강건함.** 지어낸 숫자에 결과가 좌우되지 않음 → 발표에서 방어 가능`
    : `- ⚠️ 섭동에 민감. 우도 대비를 더 뚜렷하게 하거나 관찰항목 추가 필요`);
  // ── 5. 쌍별 판별력 (구조적 결함 탐지) ──
  const cm = confusionMatrix(kb);
  const weak = cm.filter(p => p.total < 0.35);
  L.push(`\n## 5. 쌍별 판별력 (Jensen-Shannon divergence)`);
  L.push(`\n- 최약 쌍: **${cm[0].total.toFixed(3)} bit** (${kb.hypotheses[cm[0].a].label} ↔ ${kb.hypotheses[cm[0].b].label})`);
  L.push(`- 취약 쌍(D_JS<0.35): **${weak.length}개** / 전체 ${cm.length}쌍`);
  if (weak.length) {
    L.push(`\n⚠️ 아래 쌍은 어떤 알고리즘으로도 못 가릅니다. **정보가 없기 때문**입니다. 판별 축을 추가하세요:\n`);
    L.push(`| 쌍 | D_JS | 최선 축 | 처방 |`);
    L.push(`|---|---|---|---|`);
    for (const p of weak)
      L.push(`| ${kb.hypotheses[p.a].label} ↔ ${kb.hypotheses[p.b].label} | ${p.total.toFixed(3)} | ${p.best.id} (${p.best.d.toFixed(2)}) | 새 축 필요 |`);
    L.push(`\n→ 'node engine/propose_axis.js' 로 후보 축을 평가하세요.`);
  } else {
    L.push(`- ✅ 모든 원인 쌍이 구분 가능. KB에 구조적 결함 없음.`);
  }
  if (q.diag.length) { L.push(`\n## 6. 경고`); q.diag.forEach(d => L.push(`- ${d}`)); }
  return L.join("\n");
}
