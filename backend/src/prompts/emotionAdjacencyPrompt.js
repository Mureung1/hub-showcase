// Gemini가 tagPrompt의 감정 목록 밖 단어를 골라 태깅이 실패했을 때만 쓰는 프롬프트.
// 그 단어가 "현재 감정 어휘"(기본 21개 + 그동안 학습으로 늘어난 것) 중 어디와 가까운지 물어서
// 인접 관계를 채운다. existingEmotions는 호출 시점의 최신 목록을 그대로 넘겨야 한다 —
// 목록이 계속 늘어나므로 여기서 상수로 박아두지 않는다.
export const EMOTION_ADJACENCY_PROMPT_VERSION = 'emotion-adjacency-v1'

const EMOTION_ADJACENCY_SYSTEM_PROMPT = `너는 감정 어휘를 분류하는 역할이다.
새로운 감정 단어 하나가 주어진다. 아래 감정 목록 중에서
그 단어와 정서적으로 가장 가까운 감정을 1~2개 골라라.
반드시 목록에 있는 단어만 골라라. 목록에 없는 단어를 새로 만들지 마라.
정말 하나도 안 가까우면 빈 배열로 답해라.

설명 없이 아래 JSON만 출력해라.
{"adjacent_to": ["", ""]}`

export function buildEmotionAdjacencyPrompt({ newEmotion, existingEmotions }) {
  const system = `${EMOTION_ADJACENCY_SYSTEM_PROMPT}\n\n감정 목록:\n[${existingEmotions.join(', ')}]`
  const user = `새 감정 단어: ${newEmotion}`
  return { system, user }
}
