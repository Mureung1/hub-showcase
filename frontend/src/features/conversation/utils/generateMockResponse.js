const INTENT_PATTERNS = {
  greeting: /^(안녕하세요|안녕|반가워|하이|hello\b|hi\b)/i,
  gratitude: /고마워|고맙습니다|감사해|감사합니다/,
  anxiety: /걱정|불안|긴장|두려|무서|실수|실패|망쳤/,
  tired: /피곤|졸려|지쳐|힘이 없어|쉬고 싶/,
  anger: /화나|화가 나|짜증|분노|억울/,
  sadness: /슬퍼|우울|외로|속상|눈물|마음이 아파/,
  positive: /기뻐|좋았|행복|성공|잘했|합격|신나/,
  advice: /어떻게|어쩌면|방법|도와줘|조언|추천/,
  question: /\?|뭐야|왜|언제|어디|누구|알려줘/
};

function recentMessagesOf(messages, role) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => message?.role === role && typeof message.content === "string")
    .slice(-4);
}

function findIntent(text, analysis) {
  if (/죽고 싶|사라지고 싶|자해|극단적 선택/.test(text)) return "urgent";

  const orderedIntents = [
    "greeting",
    "gratitude",
    "anxiety",
    "tired",
    "anger",
    "sadness",
    "positive",
    "advice",
    "question"
  ];
  const directIntent = orderedIntents.find((intent) =>
    INTENT_PATTERNS[intent].test(text)
  );
  if (directIntent) return directIntent;

  const possibleStates = Array.isArray(analysis?.possibleStates)
    ? analysis.possibleStates
    : [];
  if (possibleStates.some((state) => /걱정|긴장/.test(state.label))) return "anxiety";
  if (possibleStates.some((state) => /피로/.test(state.label))) return "tired";
  if (possibleStates.some((state) => /긍정/.test(state.label))) return "positive";
  return "open";
}

function responseCandidates(intent, turn) {
  const stage = Math.min(turn, 2);
  const responses = {
    greeting: [
      "안녕. 오늘 어떤 이야기를 나누고 싶어?",
      "다시 이야기해 줘서 반가워. 지금 마음에 가장 먼저 떠오르는 건 뭐야?",
      "계속 듣고 있어. 오늘 대화에서 함께 정리하고 싶은 게 있을까?"
    ],
    gratitude: [
      "말해줘서 나도 고마워. 더 이야기하고 싶다면 계속 들어줄게.",
      "조금이라도 도움이 됐다면 다행이야. 지금은 마음이 전보다 어때?",
      "함께 정리해 가면 돼. 다음으로 이야기하고 싶은 게 있을까?"
    ],
    anxiety: [
      "마음에 걸리는 일이 있는 것 같아. 어떤 부분이 가장 걱정되는지 하나만 말해줄래?",
      "그 걱정이 계속 이어지고 있구나. 지금은 해결 방법을 같이 정리할까, 아니면 먼저 더 들어줄까?",
      "당장 바꿀 수 있는 가장 작은 한 가지를 골라보자. 지금 떠오르는 행동이 있을까?"
    ],
    tired: [
      "많이 지친 것 같아. 길게 설명하지 않아도 괜찮아. 몸이 힘든지 마음이 힘든지만 알려줄래?",
      "피로가 계속되고 있구나. 지금 잠깐 멈출 수 있는 일과 꼭 해야 하는 일을 나눠볼까?",
      "지금 가능한 가장 짧은 휴식부터 정해보자. 물 마시기나 5분 쉬기 중 무엇이 편할까?"
    ],
    anger: [
      "화가 날 만한 일이 있었던 것 같아. 가장 억울하거나 불편했던 부분이 뭐였어?",
      "그 상황이 계속 마음에 남아 있구나. 사실과 네 감정을 나눠서 같이 정리해 볼까?",
      "바로 반응하기 전에 원하는 결과를 하나 정해보자. 상대에게 무엇이 달라지길 바라?"
    ],
    sadness: [
      "마음이 무거워 보이네. 무슨 일이 있었는지 천천히 말해줘도 괜찮아.",
      "그 마음이 쉽게 가라앉지 않는 것 같아. 지금 가장 필요한 건 위로, 정리, 해결 중 어느 쪽일까?",
      "혼자 견디지 않아도 돼. 오늘 연락할 수 있는 가까운 사람이 있을까?"
    ],
    positive: [
      "좋은 일이 있었구나. 어떤 순간이 가장 기뻤는지 듣고 싶어.",
      "그 기분을 더 오래 기억하고 싶겠다. 네가 잘한 부분은 무엇이라고 생각해?",
      "좋은 흐름을 이어가려면 다음에 해보고 싶은 작은 일이 있을까?"
    ],
    advice: [
      "같이 방법을 찾아보자. 먼저 원하는 결과와 지금 가장 큰 제약을 하나씩 알려줘.",
      "지금까지 해본 방법 중 효과가 있었던 것과 없었던 것을 나눠볼래?",
      "선택지를 두세 개로 줄여보자. 시간, 마음의 부담, 결과 중 무엇을 가장 중요하게 볼까?"
    ],
    question: [
      "내가 아는 범위에서 같이 정리해 볼게. 무엇이 가장 궁금한지 조금만 더 구체적으로 말해줄래?",
      "앞의 이야기와 연결해서 답해볼게. 원하는 답이 설명인지, 선택지인지, 행동 계획인지 알려줘.",
      "핵심 조건을 하나만 더 알려주면 더 맞는 방향으로 정리할 수 있어."
    ],
    open: [
      "네 이야기를 천천히 들려줘. 지금 가장 마음에 남는 장면은 뭐야?",
      "아까 이야기한 부분과 이어지는 것 같아. 그 뒤에 어떤 일이 있었어?",
      "여기까지 이야기한 내용을 같이 정리해 볼까, 아니면 조금 더 말해볼래?"
    ]
  };

  return [
    responses[intent]?.[stage] || responses.open[stage],
    ...(responses[intent] || responses.open)
  ];
}

export function generateMockResponse(
  messageText,
  analysis = {},
  { recentMessages = [] } = {}
) {
  const text = String(messageText || "").trim().toLowerCase();
  const previousUserMessages = recentMessagesOf(recentMessages, "user");
  const previousAiMessages = recentMessagesOf(recentMessages, "ai");
  const intent = findIntent(text, analysis);

  if (intent === "urgent") {
    return "지금 혼자 감당하기 어려운 상태로 들려. 즉시 가까운 사람에게 현재 상황을 알리고, 다칠 가능성이 있다면 지역 응급 서비스나 의료기관의 도움을 받아줘.";
  }

  const lastAiResponse = previousAiMessages.at(-1)?.content;
  const candidates = responseCandidates(intent, previousUserMessages.length);
  return candidates.find((candidate) => candidate !== lastAiResponse) || candidates[0];
}
