// ============================================================
// engine/core.js — 순수 수학. LLM 없음. 부작용 없음.
//   P(H|E) = P(E|H)P(H) / Σ P(E|Hj)P(Hj)
//   H(P)   = -Σ p log2 p
//   IG(Q)  = H(P) - Σ_a P(a) H(P|a)
// ============================================================

// 우도 클램프: Naive Bayes 과신(double counting) 방어
export const LMIN = 0.05, LMAX = 0.95;
export const clampL = (x) => Math.min(LMAX, Math.max(LMIN, x));

// KB에 명시 안 된 (증거,가설) 조합 = 중립 = 사후확률 불변
export const NEUTRAL = 0.5;
export const L_of = (L, id) => clampL(L?.[id] ?? NEUTRAL);

export function normalize(p) {
  const s = Object.values(p).reduce((a, b) => a + b, 0);
  if (s <= 0) throw new Error("normalize: 확률 합이 0");
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v / s]));
}

export function entropy(p) {
  return -Object.values(p)
    .filter((v) => v > 1e-12)
    .reduce((h, v) => h + v * Math.log2(v), 0);
}

// 베이즈 갱신 (로그공간 — 가설 수가 늘어도 언더플로 안전)
export function bayes(prior, L) {
  const logs = Object.entries(prior).map(([k, p]) => [
    k,
    Math.log(Math.max(p, 1e-12)) + Math.log(L_of(L, k)),
  ]);
  const mx = Math.max(...logs.map(([, v]) => v));
  return normalize(
    Object.fromEntries(logs.map(([k, v]) => [k, Math.exp(v - mx)]))
  );
}

// P(answer=a) = Σ_i P(a|Hi)P(Hi)   ← 베이즈의 분모. 전확률 법칙.
export function pAnswer(prior, L) {
  return Object.entries(prior).reduce((s, [k, p]) => s + p * L_of(L, k), 0);
}

// 기대 정보이득 = 상호정보량 I(H;Q)
export function infoGain(prior, obs) {
  const H0 = entropy(prior);
  const opts = Object.values(obs.options);
  const w = opts.map((o) => pAnswer(prior, o.L));
  const wSum = w.reduce((a, b) => a + b, 0);
  if (wSum <= 0) return 0;
  const expH = opts.reduce(
    (s, o, i) => s + (w[i] / wSum) * entropy(bayes(prior, o.L)),
    0
  );
  return Math.max(0, H0 - expH); // 이론상 IG>=0. 수치오차 방어.
}

// 비용 보정: 탭(1.0) < 사진(3.0) < 물리행동(4.0)
export const score = (prior, obs, lambda = 1.0) =>
  infoGain(prior, obs) / Math.pow(obs.cost ?? 1.0, lambda);

export const ranked = (p) =>
  Object.entries(p).sort((a, b) => b[1] - a[1]).map(([id, prob]) => ({ id, p: prob }));

// confidence: 숫자 노출 금지 → 질적 라벨만 (프로젝트 설계 원칙)
export function label(p) {
  if (p >= 0.60) return "유력";
  if (p >= 0.35) return "가능";
  if (p >= 0.15) return "낮음";
  return "희박";
}
