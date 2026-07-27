// 편지 태깅(감정·키워드·요약·위기신호 추출) 프롬프트.
// 버전 상수를 프롬프트 텍스트와 같은 파일에 둬서, 프롬프트가 바뀌면 버전도 같이 올리게 한다.
import { EMOTIONS } from '../config/emotions.js'

export const TAG_PROMPT_VERSION = 'tag-v1'

// EMOTIONS는 태깅 실패로 어휘가 늘어날 수 있어(emotions.js의 addDynamicEmotion),
// 문자열을 서버 시작 시 한 번만 만들면 늘어난 감정이 프롬프트에 반영되지 않는다.
// 그래서 매 호출(buildTagPrompt)마다 함수로 새로 만든다.
function buildTagSystemPrompt() {
  return `너는 편지를 읽고 태그를 다는 분류기다.
아래 편지를 읽고 다음을 추출해라.

1. primary_emotion: 글쓴이의 가장 지배적인 감정 1개
2. secondary_emotions: 그 다음으로 뚜렷한 감정 2개
3. keywords: 편지의 상황과 소재를 나타내는 명사형 키워드 3개
4. summary: 이 편지가 어떤 상황인지 한 문장으로. 40자 이내.
   감정어가 아니라 상황이 드러나게 쓸 것.
5. risk_flag: 글쓴이가 자해나 극단적 선택을 생각하고 있다고
   볼 만한 표현이 있으면 true, 없으면 false.
   단순한 슬픔이나 무력감은 false다. 확실하지 않으면 true로 해라.

감정은 반드시 아래 목록에서만 골라라. 목록에 없는 단어를 만들지 마라.
[${EMOTIONS.join(', ')}]

키워드는 감정어가 아니라 상황/소재여야 한다.
(좋은 예: 취업준비, 이별, 병간호 / 나쁜 예: 슬픔, 힘듦)
아래 대표 키워드 중 맞는 것이 있으면 우선 사용하고,
없을 때만 새 단어를 만들어라.
{{REPRESENTATIVE_KEYWORDS}}

설명 없이 아래 JSON만 출력해라.
{"primary_emotion":"", "secondary_emotions":["",""],
 "keywords":["","",""], "summary":"", "risk_flag":false}`
}

export function buildTagPrompt({ letterBody, representativeKeywords }) {
  const system = buildTagSystemPrompt().replace(
    '{{REPRESENTATIVE_KEYWORDS}}',
    `[${representativeKeywords.join(', ')}]`,
  )
  const user = `편지:\n---\n${letterBody}\n---`
  return { system, user }
}
