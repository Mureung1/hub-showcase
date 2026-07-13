// ============================================================
// agents/aggregate.js — LLM 아님. 카드를 "세어서" 숫자를 만든다.
//   P(H) = (n_i + α) / (N + αK)              ← Laplace: 0 확률 금지
//   P(a|H) = (c(a,i) + α) / (c(i) + α|A|)    ← 조건부 빈도
//   → 5단계 스냅 (데이터 30개에 소수점 2자리는 환상)
// ============================================================
import { snap5 } from "./spec.js";

const ALPHA = 1.0;

export function aggregate(cards, spec) {
  // ── 1. 원인별 언급 집계 (weight: primary=1.0, secondary=0.4) ──
  const cnt = {}, ev = {};   // ev[cause] = [출처URL...]
  for (const c of cards) {
    for (const m of c.mentions ?? []) {
      const w = m.rank === "primary" ? 1.0 : 0.4;
      cnt[m.cause] = (cnt[m.cause] ?? 0) + w;
      (ev[m.cause] ??= new Set()).add(c.url);
    }
  }

  // 상위 K개만 채택 (maxHypotheses)
  const top = Object.entries(cnt)
    .sort((a, b) => b[1] - a[1])
    .slice(0, spec.maxHypotheses);
  const causes = top.map(([c]) => c);
  const N = top.reduce((s, [, n]) => s + n, 0);
  const K = causes.length;

  // ── 2. 사전확률 (Laplace) ──
  const hypotheses = {};
  for (const [cause, n] of top) {
    const prior = (n + ALPHA) / (N + ALPHA * K);
    const srcs = [...(ev[cause] ?? [])];
    hypotheses[cause] = {
      label: labelOf(cards, cause) ?? cause,
      prior: +prior.toFixed(3),
      prior_source: `문서 ${srcs.length}건 언급 (가중 ${n.toFixed(1)}/${N.toFixed(1)}, Laplace α=1)`,
      evidence: srcs.slice(0, 5),
      solution: solutionOf(cards, cause),
      verify: verifyOf(cards, cause),
    };
  }

  // ── 3. 우도 (축별 조건부 빈도) ──
  const observables = [];
  for (const [axis, values] of Object.entries(spec.axes)) {
    const meta = spec.axisQuestions[axis];
    const A = values.length;
    const cc = {};  // cc[cause][value] = count
    const ct = {};  // ct[cause] = total

    for (const c of cards) {
      const v = c.axes?.[axis];
      if (!v || v === "unspecified") continue;      // 무응답은 세지 않음
      for (const m of c.mentions ?? []) {
        if (!causes.includes(m.cause)) continue;
        const w = m.rank === "primary" ? 1.0 : 0.4;
        (cc[m.cause] ??= {})[v] = (cc[m.cause]?.[v] ?? 0) + w;
        ct[m.cause] = (ct[m.cause] ?? 0) + w;
      }
    }

    // ★ 핵심 보정: 원시 조건부확률을 그대로 스냅하면 안 된다.
    //    각 원인의 "이 축에서의 평균 응답률"(=기저율) 대비 상대값으로 본다.
    //    lift = P(a|H) / P(a)   ← 이 답변이 이 원인을 얼마나 '들어올리는가'
    //    lift > 1  → 지지 증거,  lift < 1 → 반증
    //    그래야 선택지 개수(A)에 따라 우도가 통째로 낮아지는 왜곡이 사라진다.
    const raw = {};   // raw[cause][v] = P(v|cause)
    for (const cause of causes) {
      raw[cause] = {};
      for (const v of values) {
        if (v === "unspecified") continue;
        const num = (cc[cause]?.[v] ?? 0) + ALPHA;
        const den = (ct[cause] ?? 0) + ALPHA * (A - 1);
        raw[cause][v] = num / den;
      }
    }
    // 기저율 P(v) = 원인들에 대한 평균
    const base = {};
    for (const v of values) {
      if (v === "unspecified") continue;
      base[v] = causes.reduce((s, c) => s + raw[c][v], 0) / causes.length;
    }

    const options = {};
    for (const v of values) {
      const L = {};
      for (const cause of causes) {
        if (v === "unspecified") continue;
        const lift = raw[cause][v] / Math.max(base[v], 1e-9);
        L[cause] = snap5(liftToL(lift));            // lift → 5단계 우도
      }
      const meaningful = Object.fromEntries(
        Object.entries(L).filter(([, x]) => x !== 0.5)   // 중립은 생략
      );
      options[v] = { label: meta?.labels?.[v] ?? v, L: meaningful };
    }
    observables.push({
      id: axis,
      question: meta?.q ?? axis,
      cost: meta?.cost ?? 1.0,
      ...(meta?.note ? { note: meta.note } : {}),
      options,
      n_support: Object.values(ct).reduce((a, b) => a + b, 0),
    });
  }

  return {
    domain: spec.domain,
    version: "0.1.0-draft",
    generated: new Date().toISOString().slice(0, 10),
    n_cards: cards.length,
    hypotheses,
    observables,
  };
}

// lift = P(a|H)/P(a) → 5단계 우도.
//   베이즈에서 순위를 정하는 건 우도의 '비율'이므로(정규화상수 소거),
//   lift를 단조증가로 사상하면 순위가 보존된다.
//   lift 1.0 = 무정보 = 0.5(중립). 이걸 기준으로 위아래로 벌린다.
function liftToL(lift) {
  if (lift >= 2.2) return 0.90;   // 이 답변이 이 원인을 강하게 지목
  if (lift >= 1.35) return 0.70;  // 지지
  if (lift >= 0.75) return 0.50;  // 중립 (생략됨)
  if (lift >= 0.40) return 0.25;  // 반증
  return 0.05;                    // 강한 반증
}

const labelOf = (cards, cause) =>
  cards.flatMap(c => c.mentions ?? []).find(m => m.cause === cause && m.label)?.label;

const solutionOf = (cards, cause) => {
  const s = cards.flatMap(c => (c.mentions ?? []).filter(m => m.cause === cause && m.solution))
                 .map(m => m.solution);
  return s[0] ?? "";                       // 최빈 해결책 (v0: 첫 번째)
};

const verifyOf = (cards, cause) => {
  const v = cards.flatMap(c => (c.mentions ?? []).filter(m => m.cause === cause && m.verify))
                 .map(m => m.verify)[0];
  return v ? { action: v, photo: /사진|육안|열어|확인/.test(v), cost: 3.0 } : null;
};
