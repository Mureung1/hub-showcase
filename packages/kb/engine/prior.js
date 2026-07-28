// ============================================================
// engine/prior.js — 세션 간 기억: 과거 진단 결과를 prior에 반영
//
// 이 파일은 core.js, policy.js를 수정하지 않고
// prior 조정만 담당하는 순수 함수입니다.
// ============================================================

// ★ 튜닝 가능한 파라미터 (나중에 골든셋으로 최적화)
export const HISTORY_WEIGHT = 3;   // 과거 세션 1건당 pseudo-count
const PRIOR_STRENGTH = 10;         // 기존 KB prior의 유효 샘플 크기

/**
 * 과거 세션 이력을 반영하여 조정된 hypotheses 반환
 *
 * Laplace 방식:
 *   new_prior_i = (prior_i * PRIOR_STRENGTH + histCount_i) / (PRIOR_STRENGTH + H)
 *   - H = 전체 history 카운트 합
 *
 * @param {Object} kb - 지식베이스 (hypotheses 포함)
 * @param {string[]} history - 과거 종료 세션의 final_cause 배열
 * @returns {Object} - 조정된 hypotheses 객체 (prior 값만 변경됨)
 */
export function buildPrior(kb, history) {
  const hypothesisIds = Object.keys(kb.hypotheses);

  // ─────────────────────────────────────────────────────────────
  // 회귀 안전장치: 빈 히스토리면 KB 그대로 반환
  // ─────────────────────────────────────────────────────────────
  if (!history || history.length === 0) {
    return kb.hypotheses;
  }

  // ─────────────────────────────────────────────────────────────
  // history 카운트 집계
  // ─────────────────────────────────────────────────────────────
  const historyCount = {};
  for (const id of hypothesisIds) {
    historyCount[id] = 0;
  }
  for (const cause of history) {
    if (cause in historyCount) {
      historyCount[cause] += HISTORY_WEIGHT;
    }
    // unknown cause는 무시 (KB에 없는 hypothesis)
  }

  const H = Object.values(historyCount).reduce((a, b) => a + b, 0);

  // ─────────────────────────────────────────────────────────────
  // Laplace 방식으로 prior 재계산
  // ─────────────────────────────────────────────────────────────
  const hypotheses = {};
  for (const [id, h] of Object.entries(kb.hypotheses)) {
    const baseCount = h.prior * PRIOR_STRENGTH;
    const newCount = baseCount + historyCount[id];
    const newPrior = newCount / (PRIOR_STRENGTH + H);

    hypotheses[id] = {
      ...h,
      prior: newPrior,
    };
  }

  return hypotheses;
}
