import { SCORE_KEYS, STUDY_QUESTIONS, STRESS_QUESTIONS } from "../data/questions";

const BASE_SCORE = 50;

const MBTI_HINTS = {
  I: { focusEnergy: 4, stimulationNeed: -2 },
  E: { stimulationNeed: 4, selfUnderstanding: 2 },
  S: { inputStyle: 3, planningStability: 2 },
  N: { inputStyle: 2, stimulationNeed: 3 },
  T: { failureRecovery: 3, emotionImpact: -2 },
  F: { emotionImpact: 3, selfUnderstanding: 3 },
  J: { planningStability: 4, flexibilityNeed: -2 },
  P: { flexibilityNeed: 4, stimulationNeed: 2 },
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

export function calculateScores({ mbti, mbtiKnown, studyAnswers, stressAnswers }) {
  const scores = SCORE_KEYS.reduce((acc, key) => ({ ...acc, [key]: BASE_SCORE }), {});

  if (mbtiKnown && mbti) {
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
