// ============================================================
// lib/label.js — 불변식 6번 방어선
// 확률 → 라벨 변환을 여기 한 곳에만 둔다.
// 응답 생성은 toResponse() 하나만 거치게 한다.
// ============================================================

// PROJECT_CONTEXT.md 확정값. 임의로 바꾸지 말 것 (불변식 3번).
const T = {
  PROPOSE: 0.60,
  GAP: 0.10,
};

// 확률 내림차순 정렬
const ranked = (p) =>
  Object.entries(p).sort((a, b) => b[1] - a[1]).map(([id, prob]) => ({ id, p: prob }));

/**
 * 확률과 격차를 받아 영문 라벨 반환
 * most_likely : p >= 0.60 이고 1등과 2등 격차 >= 0.10
 * possible    : p >= 0.25
 * unlikely    : 그 외
 */
export function scoreToLabel(p, gap) {
  if (p >= T.PROPOSE && gap >= T.GAP) return 'most_likely';
  if (p >= 0.25) return 'possible';
  return 'unlikely';
}

/**
 * posterior + KB를 받아 hypotheses 응답 형식으로 변환
 * 확률 숫자를 절대 포함하지 않음
 */
export function toHypothesesResponse(posterior, kb) {
  const rankedList = ranked(posterior);
  return rankedList.map(({ id, p }, idx) => {
    const next = rankedList[idx + 1];
    const gap = next ? p - next.p : 1;
    return {
      id,
      cause: kb.hypotheses[id].label,
      confidence: scoreToLabel(p, gap),
      evidence: kb.hypotheses[id].solution,
    };
  });
}

/**
 * 엔진 결정 + 상태를 받아 API 응답 형식으로 변환
 * 모든 응답은 이 함수를 거친다 — 숫자 유출 방지
 */
export function toResponse(sessionId, decision, state, kb) {
  const base = { sessionId, done: false };

  if (decision.move === 'ASK') {
    const obs = decision.obs;
    return {
      ...base,
      needMoreInfo: {
        axisId: obs.id,
        question: obs.question,
        options: Object.entries(obs.options).map(([id, opt]) => ({
          id,
          label: opt.label,
        })),
      },
      hypotheses: null,
    };
  }

  if (decision.move === 'PROPOSE') {
    return {
      ...base,
      needMoreInfo: null,
      hypotheses: toHypothesesResponse(state.posterior, kb),
    };
  }

  if (decision.move === 'ASSUME_AND_PROPOSE') {
    return {
      ...base,
      needMoreInfo: null,
      hypotheses: toHypothesesResponse(state.posterior, kb),
      assumed: true,
      assumeReason: decision.why,
    };
  }

  if (decision.move === 'VERIFY') {
    return {
      ...base,
      needMoreInfo: {
        axisId: `verify_${decision.top.id}`,
        question: decision.action.action,
        options: [
          { id: 'yes', label: '예' },
          { id: 'no', label: '아니오' },
        ],
      },
      hypotheses: null,
    };
  }

  // 기본 폴백 — hypotheses 제시
  return {
    ...base,
    needMoreInfo: null,
    hypotheses: toHypothesesResponse(state.posterior, kb),
  };
}
