// 논문 기반 MBTI × 인지과학 공부법 매칭 기준 (에이전트 a).
// 기준 문서: docs/matching-criteria.md, 출처: docs/reference.md
//
// 가벼운 정직 라벨: 아래는 문헌에서 도출한 "선호일 수 있는" 출발점이며,
// 실제 효과는 실행 후 결과로 확인한다(돕기 → 측정 → 축적). 그래서 강점 + 약점 보완을 함께 둔다.

// 16개 유형 → Keirsey 4기질
export const TEMPERAMENT_OF = {
  ISTJ: "SJ", ISFJ: "SJ", ESTJ: "SJ", ESFJ: "SJ",
  ISTP: "SP", ISFP: "SP", ESTP: "SP", ESFP: "SP",
  INTJ: "NT", INTP: "NT", ENTJ: "NT", ENTP: "NT",
  INFJ: "NF", INFP: "NF", ENFJ: "NF", ENFP: "NF",
};

export const TEMPERAMENT_LABEL = {
  SJ: "관리자형(SJ)",
  SP: "실용형(SP)",
  NT: "분석형(NT)",
  NF: "이상형(NF)",
};

// 기질별: 강점 매칭(+큰 가중) · 약점 보완(+작은 가중) · 설명 · 출처
const TEMPERAMENT_MATCH = {
  SJ: {
    strengths: { spacing: 8, environment: 6, retrieval: 4 },
    compensate: { interleaving: 4 },
    reason: "계획·자기관리 강점을 분산·환경설계로 살리고, 유연성은 교차학습으로 보완합니다.",
    sources: ["E3", "E1", "F1"],
  },
  SP: {
    strengths: { shortBlock: 8, errorAnalysis: 6, interleaving: 4 },
    compensate: { spacing: 4 },
    reason: "실전·문제풀이 강점을 짧은 집중·오답분석으로 살리고, 꾸준함은 분산으로 보완합니다.",
    sources: ["E3", "E1"],
  },
  NT: {
    strengths: { selfExplanation: 8, retrieval: 6, errorAnalysis: 4 },
    compensate: { spacing: 4 },
    reason: "원리·논리 강점을 자기설명·인출로 살리고, 구체 반복은 분산으로 보완합니다.",
    sources: ["E3", "E11"],
  },
  NF: {
    strengths: { selfExplanation: 8, environment: 6, spacing: 4 },
    compensate: { errorAnalysis: 4 },
    reason: "의미 연결 강점을 자기설명·환경설계로 살리고, 객관 검증은 오답분석으로 보완합니다.",
    sources: ["E3", "E4"],
  },
};

// 4축 보조(약한 가중)
const AXIS_NUDGE = {
  I: { environment: 3, retrieval: 2 },
  E: { selfExplanation: 3, interleaving: 2 },
  S: { errorAnalysis: 3, interleaving: 2 },
  N: { selfExplanation: 2, retrieval: 3 },
  T: { errorAnalysis: 3, spacing: 2 },
  F: { environment: 3, shortBlock: 2 },
  J: { spacing: 3, environment: 2 },
  P: { interleaving: 3, shortBlock: 2 },
};

const MAX_ADJUSTMENT = 15; // 개인 응답을 압도하지 않도록 방법별 상한

function addInto(target, patch = {}) {
  Object.entries(patch).forEach(([methodId, value]) => {
    target[methodId] = (target[methodId] ?? 0) + value;
  });
}

// 공식 MBTI 문자열 → { temperament, adjustments, reason, sources }
export function matchMethods(mbti) {
  if (!mbti || mbti.length !== 4) {
    return { temperament: null, adjustments: {}, reason: "", sources: [] };
  }
  const temperament = TEMPERAMENT_OF[mbti] ?? null;
  const adjustments = {};

  if (temperament) {
    const match = TEMPERAMENT_MATCH[temperament];
    addInto(adjustments, match.strengths);
    addInto(adjustments, match.compensate);
  }
  mbti.split("").forEach((letter) => addInto(adjustments, AXIS_NUDGE[letter]));

  // 상한 적용
  Object.keys(adjustments).forEach((methodId) => {
    adjustments[methodId] = Math.min(MAX_ADJUSTMENT, adjustments[methodId]);
  });

  return {
    temperament,
    temperamentLabel: temperament ? TEMPERAMENT_LABEL[temperament] : "",
    adjustments,
    reason: temperament ? TEMPERAMENT_MATCH[temperament].reason : "",
    sources: temperament ? TEMPERAMENT_MATCH[temperament].sources : [],
  };
}
