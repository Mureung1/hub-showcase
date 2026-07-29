import { emotionDefinitions } from "../../../shared/constants/emotionDefinitions";
import { faceOptions, voiceOptions } from "../../emotion-input/data/signalOptions";
import { scenarioAnalysisPresets } from "../data/scenarioAnalysisPresets";
import { deriveLiveFaceEmotionAdjustments } from "./deriveLiveFaceEmotionAdjustments";
import { normalizeEmotionScores } from "./normalizeEmotionScores";

const faceScoreAdjustments = {
  neutral: { neutral: 16 },
  smile: { joy: 28 },
  tense: { anxiety: 18, anger: 10 },
  downcast: { sadness: 25 },
  angry: { anger: 30 }
};

const voiceScoreAdjustments = {
  normal: { neutral: 10 },
  fast: { anxiety: 18 },
  low: { sadness: 18 },
  strong: { anger: 20 },
  bright: { joy: 22 }
};

function addScores(target, adjustments) {
  Object.entries(adjustments || {}).forEach(([key, value]) => {
    target[key] = (target[key] || 0) + value;
  });
}

function increasePossibleState(possibleStates, pattern, fallback) {
  const index = possibleStates.findIndex((state) => pattern.test(state.label));
  if (index >= 0) {
    possibleStates[index].confidence = Math.min(1, possibleStates[index].confidence + fallback.increase);
    return;
  }
  possibleStates.unshift({ label: fallback.label, confidence: fallback.confidence });
}

export function analyzeEmotionSignals({
  situationText = "",
  faceSignal = "neutral",
  faceFeatures = [],
  voiceSignal = "normal",
  recentMessages = [],
  selectedScenario = "normal"
} = {}) {
  const preset = scenarioAnalysisPresets[selectedScenario] || scenarioAnalysisPresets.normal;
  const rawScores = { ...preset.rawScores };
  const possibleStates = preset.possibleStates.map((state) => ({ ...state }));
  const evidence = [...preset.evidence];
  let responseApproach = preset.responseApproach;
  let needsConfirmation = preset.needsConfirmation;
  const text = situationText.toLowerCase();
  const hasLiveFaceFeatures =
    Array.isArray(faceFeatures) && faceFeatures.length > 0;

  if (hasLiveFaceFeatures) {
    addScores(rawScores, deriveLiveFaceEmotionAdjustments(faceFeatures));
  } else {
    addScores(rawScores, faceScoreAdjustments[faceSignal]);
  }
  addScores(rawScores, voiceScoreAdjustments[voiceSignal]);

  const faceLabel = faceOptions.find((option) => option.value === faceSignal)?.label;
  const voiceLabel = voiceOptions.find((option) => option.value === voiceSignal)?.label;
  if (hasLiveFaceFeatures) {
    evidence.push("카메라에서 감지한 얼굴 움직임 강도를 실시간 반영");
  } else if (faceLabel) {
    evidence.push(`선택한 얼굴 신호: ${faceLabel}`);
  }
  if (voiceLabel) evidence.push(`선택한 음성 신호: ${voiceLabel}`);

  if (/힘들|실패|망쳤|걱정/.test(text)) {
    addScores(rawScores, { anxiety: 32, sadness: 10 });
    increasePossibleState(possibleStates, /걱정|긴장/, {
      label: "걱정 가능성",
      confidence: 0.6,
      increase: 0.12
    });
    evidence.unshift("사용자 메시지에서 걱정 관련 단어 검출");
    needsConfirmation = true;
  }

  if (/피곤|졸려|지쳐/.test(text)) {
    addScores(rawScores, { sadness: 30, neutral: 8 });
    increasePossibleState(possibleStates, /피로|집중/, {
      label: "피로 가능성",
      confidence: 0.6,
      increase: 0.14
    });
    evidence.unshift("사용자 메시지에서 피로 관련 단어 검출");
    responseApproach = "keep_brief";
    needsConfirmation = true;
  }

  if (/기뻐|성공|잘했|합격/.test(text)) {
    addScores(rawScores, { joy: 40 });
    possibleStates.unshift({ label: "긍정 가능성", confidence: 0.7 });
    evidence.unshift("사용자 메시지에서 긍정 관련 단어 검출");
    responseApproach = "continue_normally";
    needsConfirmation = false;
  }

  if (/화나|분노|짜증/.test(text)) {
    addScores(rawScores, { anger: 38, anxiety: 8 });
    possibleStates.unshift({ label: "분노 가능성", confidence: 0.66 });
    evidence.unshift("사용자 메시지에서 분노 관련 단어 검출");
    needsConfirmation = true;
  }

  if (Array.isArray(recentMessages) && recentMessages.length > 0) {
    const lastUserMessage = [...recentMessages].reverse().find((message) => message.role === "user");
    if (lastUserMessage && /발표|시험|면접/.test((lastUserMessage.content || "").toLowerCase())) {
      addScores(rawScores, { anxiety: 12 });
      evidence.push("이전 대화에서 발표/시험 관련 언급");
      increasePossibleState(possibleStates, /걱정|긴장/, {
        label: "걱정 가능성",
        confidence: 0.5,
        increase: 0.08
      });
      needsConfirmation = true;
    }
  }

  const scores = normalizeEmotionScores(rawScores).map(({ key, score }) => ({
    key,
    label: emotionDefinitions[key]?.label || key,
    score
  }));

  return {
    inputText: situationText,
    scores,
    possibleStates: possibleStates.map((state) => ({
      ...state,
      confidence: Math.round(state.confidence * 100) / 100
    })),
    evidence: [...new Set(evidence)],
    responseApproach,
    needsConfirmation
  };
}
