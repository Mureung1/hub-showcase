import {
  FACE_SIGNALS,
  VOICE_SIGNALS
} from "../../../../../shared/contracts/emotionAnalysisContract";

const faceLabels = {
  neutral: "평온한 표정",
  smile: "웃는 표정",
  tense: "긴장된 표정",
  downcast: "시무룩한 표정",
  angry: "굳은 표정"
};

const voiceLabels = {
  normal: "평소 어조",
  fast: "빠른 어조",
  low: "작고 느린 어조",
  strong: "강한 어조",
  bright: "밝은 어조"
};

export const faceOptions = FACE_SIGNALS.map((value) => ({
  value,
  label: faceLabels[value]
}));

export const voiceOptions = VOICE_SIGNALS.map((value) => ({
  value,
  label: voiceLabels[value]
}));
