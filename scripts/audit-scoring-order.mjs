// 점수 계산 순서 독립성 감사 (반복 실행 가능)
//
// 의미상 같은 설문 응답이 응답 객체의 property 삽입 순서와 무관하게
// 같은 행동 점수·TOP3 추천을 내는지 전수 조합으로 확인한다.
// 이 검사는 학습효과가 아니라 구현 불변조건(순서 독립성)을 점검한다.
//
// 실행 방법:
//   1) 저장소 루트에서 `npm run dev`
//   2) 브라우저 DevTools Console에서:
//        const { runScoringOrderAudit } = await import("/scripts/audit-scoring-order.mjs");
//        console.log(runScoringOrderAudit());
//
// rules-v3 기대값: scoreChanged=0, orderedTop3Changed=0, top3SetChanged=0, top1Changed=0
// (rules-v2에서는 scoreChanged=729, orderedTop3Changed=53 이 관찰되었다.)

import { STUDY_QUESTIONS, STRESS_QUESTIONS, SCORE_KEYS } from "/src/data/questions.js";
import { calculateScores, calculateMethodAffinities } from "/src/lib/scoring.js";
import { createRecommendations } from "/src/lib/recommendations.js";

export function runScoringOrderAudit() {
  const all = [...STUDY_QUESTIONS, ...STRESS_QUESTIONS];
  const total = all.reduce((count, question) => count * question.options.length, 1);

  let scoreChanged = 0;
  let maxDiff = 0;
  let orderedTop3Changed = 0;
  let top3SetChanged = 0;
  let top1Changed = 0;
  let firstRankExample = null;

  for (let index = 0; index < total; index += 1) {
    let cursor = index;
    const pairs = all.map((question) => {
      const option = question.options[cursor % question.options.length];
      cursor = Math.floor(cursor / question.options.length);
      return [question.id, option.id];
    });

    const studyPairs = pairs.slice(0, STUDY_QUESTIONS.length);
    const stressPairs = pairs.slice(STUDY_QUESTIONS.length);

    const normalStudy = Object.fromEntries(studyPairs);
    const normalStress = Object.fromEntries(stressPairs);
    const reversedStudy = Object.fromEntries([...studyPairs].reverse());
    const reversedStress = Object.fromEntries([...stressPairs].reverse());

    const base = { mbti: "", mbtiKnown: false, useMbtiHints: false };
    const normalScores = calculateScores({ ...base, studyAnswers: normalStudy, stressAnswers: normalStress });
    const reversedScores = calculateScores({ ...base, studyAnswers: reversedStudy, stressAnswers: reversedStress });

    const diff = Math.max(...SCORE_KEYS.map((key) => Math.abs(normalScores[key] - reversedScores[key])));
    if (diff > 0) {
      scoreChanged += 1;
    }
    maxDiff = Math.max(maxDiff, diff);

    const affinity = calculateMethodAffinities(normalStudy, normalStress);
    const normalRank = createRecommendations(normalScores, affinity).recommendations.map((item) => item.id);
    const reversedRank = createRecommendations(reversedScores, affinity).recommendations.map((item) => item.id);

    const orderedChanged = normalRank.join("|") !== reversedRank.join("|");
    const setChanged = [...normalRank].sort().join("|") !== [...reversedRank].sort().join("|");

    if (orderedChanged) {
      orderedTop3Changed += 1;
    }
    if (setChanged) {
      top3SetChanged += 1;
    }
    if (normalRank[0] !== reversedRank[0]) {
      top1Changed += 1;
    }
    if (orderedChanged && !firstRankExample) {
      firstRankExample = { pairs, normalRank, reversedRank, diff };
    }
  }

  return { total, scoreChanged, maxDiff, orderedTop3Changed, top3SetChanged, top1Changed, firstRankExample };
}
