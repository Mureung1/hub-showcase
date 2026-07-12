import { PREFERENCE_AXIS_LABELS, SCORE_KEYS, STUDY_QUESTIONS, STRESS_QUESTIONS } from "../data/questions";

const BASE_SCORE = 50;

const MBTI_HINTS = {
  I: { focusEnergy: 2, stimulationNeed: -1 },
  E: { stimulationNeed: 2, selfUnderstanding: 1 },
  S: { inputStyle: 2, planningStability: 1 },
  N: { inputStyle: 1, stimulationNeed: 2 },
  T: { failureRecovery: 2, emotionImpact: -1 },
  F: { emotionImpact: 2, selfUnderstanding: 1 },
  J: { planningStability: 2, flexibilityNeed: -1 },
  P: { flexibilityNeed: 2, stimulationNeed: 1 },
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function applyScores(scores, patch = {}) {
  Object.entries(patch).forEach(([key, value]) => {
    scores[key] = clampScore((scores[key] ?? BASE_SCORE) + value);
  });
}

function findOption(questions, questionId, optionId) {
  const question = questions.find((item) => item.id === questionId);
  return question?.options.find((option) => option.id === optionId);
}

const PREFERENCE_LETTERS = {
  IE: ["I", "E"],
  SN: ["S", "N"],
  TF: ["T", "F"],
  JP: ["J", "P"],
};

export function calculateScores({ mbti, mbtiKnown, studyAnswers, stressAnswers, useMbtiHints = true }) {
  const scores = SCORE_KEYS.reduce((acc, key) => ({ ...acc, [key]: BASE_SCORE }), {});

  if (useMbtiHints && mbtiKnown && mbti) {
    mbti.split("").forEach((letter) => applyScores(scores, MBTI_HINTS[letter]));
  }

  Object.entries(studyAnswers).forEach(([questionId, optionId]) => {
    const option = findOption(STUDY_QUESTIONS, questionId, optionId);
    applyScores(scores, option?.scores);
  });

  Object.entries(stressAnswers).forEach(([questionId, optionId]) => {
    const option = findOption(STRESS_QUESTIONS, questionId, optionId);
    applyScores(scores, option?.scores);
  });

  return scores;
}

export function calculateMethodAffinities(studyAnswers, stressAnswers) {
  const affinities = {};

  [
    [STUDY_QUESTIONS, studyAnswers],
    [STRESS_QUESTIONS, stressAnswers],
  ].forEach(([questions, answers]) => {
    Object.entries(answers).forEach(([questionId, optionId]) => {
      const option = findOption(questions, questionId, optionId);
      Object.entries(option?.methodHints ?? {}).forEach(([methodId, value]) => {
        affinities[methodId] = (affinities[methodId] ?? 0) + value;
      });
    });
  });

  return affinities;
}

export function calculatePreferenceProfile(studyAnswers) {
  const raw = Object.keys(PREFERENCE_AXIS_LABELS).reduce((acc, axis) => ({ ...acc, [axis]: 0 }), {});

  Object.entries(studyAnswers).forEach(([questionId, optionId]) => {
    const option = findOption(STUDY_QUESTIONS, questionId, optionId);
    Object.entries(option?.preferenceSignals ?? {}).forEach(([axis, value]) => {
      raw[axis] = (raw[axis] ?? 0) + value;
    });
  });

  const axes = Object.entries(PREFERENCE_AXIS_LABELS).map(([axis, labels]) => {
    const value = raw[axis] ?? 0;
    const [leftLetter, rightLetter] = PREFERENCE_LETTERS[axis];
    const leaning = value === 0 ? "X" : value < 0 ? leftLetter : rightLetter;

    return {
      axis,
      value,
      leaning,
      confidence: Math.min(1, Math.abs(value) / 2),
      label: value === 0 ? "균형 또는 정보 부족" : value < 0 ? labels.left : labels.right,
      analogy: labels.analogy,
    };
  });

  return {
    code: axes.map((item) => item.leaning).join(""),
    axes,
    isOfficialMbti: false,
    interpretation: "공부습관 문항에서 관찰된 탐색 신호이며 공식 MBTI 평가 결과가 아닙니다.",
  };
}

export function getSelectedOptionLabels(questions, answers) {
  return Object.entries(answers).map(([questionId, optionId]) => {
    const question = questions.find((item) => item.id === questionId);
    const option = question?.options.find((item) => item.id === optionId);

    return {
      question: question?.title ?? questionId,
      answer: option?.label ?? optionId,
    };
  });
}
