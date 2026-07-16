export function generateMockResponse(messageText, analysis) {
  const text = messageText.toLowerCase();

  if (analysis.responseApproach === "ask_gently") {
    return "발표 이야기가 마음에 많이 남아 있는 것처럼 느껴져. 내가 잘못 이해한 걸 수도 있는데, 어떤 부분이 가장 신경 쓰였어?";
  }
  if (analysis.responseApproach === "keep_brief") {
    return "오늘은 평소보다 많이 지쳐 보이는 것 같아. 짧게 말해줘도 괜찮아.";
  }
  if (analysis.responseApproach === "continue_normally") {
    if (/기뻐|성공|잘했|합격/.test(text) || analysis.possibleStates.some((state) => /긍정/.test(state.label))) {
      return "좋은 일이 있었던 것 같아. 네가 가장 기뻤던 순간이 어떤 부분이었는지 듣고 싶어.";
    }
    return "네 이야기를 천천히 들려줘. 나는 여기 있어.";
  }

  if (/힘들|실패|망쳤|걱정/.test(text) || analysis.possibleStates.some((state) => /걱정|긴장/.test(state.label))) {
    return "마음에 걸리는 일이 있는 것처럼 보이네. 조금 더 자세히 말해줄래?";
  }
  if (/피곤|졸려|지쳐/.test(text) || analysis.possibleStates.some((state) => /피로/.test(state.label))) {
    return "오늘은 너무 무리하지 않았으면 좋겠어. 짧게 이야기해도 괜찮아.";
  }

  return "그 이야기를 조금 더 들려줄래?";
}
