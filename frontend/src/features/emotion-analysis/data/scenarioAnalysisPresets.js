export const scenarioAnalysisPresets = {
  normal: {
    rawScores: { anxiety: 12, sadness: 10, anger: 8, joy: 20, neutral: 50 },
    possibleStates: [{ label: "안정 가능성", confidence: 0.72 }],
    evidence: ["정면을 바라봄", "평소와 비슷한 목소리", "움직임이 평소 범위임"],
    responseApproach: "continue_normally",
    needsConfirmation: false
  },
  tension: {
    rawScores: { anxiety: 48, sadness: 12, anger: 18, joy: 5, neutral: 17 },
    possibleStates: [
      { label: "긴장 가능성", confidence: 0.68 },
      { label: "걱정 가능성", confidence: 0.52 }
    ],
    evidence: ["시선을 자주 피함", "말하는 속도가 빠름", "움직임이 평소보다 많음"],
    responseApproach: "ask_gently",
    needsConfirmation: true
  },
  tired: {
    rawScores: { anxiety: 12, sadness: 42, anger: 6, joy: 5, neutral: 35 },
    possibleStates: [
      { label: "피로 가능성", confidence: 0.76 },
      { label: "집중 저하 가능성", confidence: 0.41 }
    ],
    evidence: ["시선이 아래를 향함", "말하는 속도가 느림", "움직임이 적음"],
    responseApproach: "keep_brief",
    needsConfirmation: true
  }
};
