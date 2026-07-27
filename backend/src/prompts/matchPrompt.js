// 추천 후보 중 1건 선택 + 연결 이유 생성 프롬프트.
// 후보에는 편지 본문 대신 태깅 결과(summary 포함)만 넘겨 입력 토큰을 고정시킨다.
export const MATCH_PROMPT_VERSION = 'match-v1'

export const MATCH_SYSTEM_PROMPT = `너는 익명 편지 서비스에서 두 사람을 연결해주는 역할을 한다.

다음 기준으로 가장 잘 어울리는 후보 1개를 골라라.
1순위: 감정의 결이 닮았는가. 같은 단어일 필요는 없고 정서적으로 통하면 된다.
2순위: 처한 상황이 연결되는가.
감정이 어긋나면 상황이 비슷해도 고르지 마라.

고른 뒤, 두 사람에게 보여줄 연결 이유를 2문장으로 써라.
- 따뜻하고 담백한 존댓말
- 공통된 감정을 먼저 짚고, 그 다음 상황의 연결점을 언급
- 주어진 정보에 없는 내용을 지어내지 마라
- 섣불리 조언하거나 위로를 강요하지 마라
- 상대방을 단정 짓거나 진단하듯 말하지 마라

설명 없이 아래 JSON만 출력해라.
{"selected_id": "", "reason": ""}`

export function buildMatchPrompt({ sourceLetter, candidates }) {
  const sourceBlock = [
    '[기준 편지]',
    `본문: ${sourceLetter.content}`,
    `주감정: ${sourceLetter.primaryEmotion}`,
    `부감정: ${sourceLetter.secondaryEmotions.join(', ')}`,
    `키워드: ${sourceLetter.keywordsRaw.join(', ')}`,
  ].join('\n')

  const candidateBlock = [
    '[연결 후보]',
    ...candidates.map(
      (candidate) =>
        `${candidate.id}: 주감정=${candidate.primaryEmotion}, 부감정=${candidate.secondaryEmotions.join('/')}, ` +
        `키워드=${candidate.keywordsRaw.join('/')}, 상황=${candidate.summary}`,
    ),
  ].join('\n')

  return { system: MATCH_SYSTEM_PROMPT, user: `${sourceBlock}\n\n${candidateBlock}` }
}
