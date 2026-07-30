import Anthropic from '@anthropic-ai/sdk'

// API 키가 있을 때만 클라이언트를 만든다. 없으면 null로 두고, 호출부는 폴백으로 처리한다.
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null

// 관절 필터링으로 걸러낸 대체 후보(candidates) 중 하나를 LLM이 "추천"으로 고른다.
// 기획서 원칙대로 LLM은 "선택"만 한다 — 근거 문구는 코드가 템플릿으로 채운다.
// 반환: 고른 운동 id(숫자), 또는 null(키 없음/호출 실패 → 호출부가 결정론적 폴백을 쓴다).
export async function pickRecommendedExerciseId({
  painBodyPart,
  originalName,
  candidates,
}) {
  if (!client || candidates.length === 0) return null

  const candidateIds = candidates.map((c) => c.id)
  const candidateList = candidates
    .map((c) => `- id ${c.id}: ${c.name}`)
    .join('\n')

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      // 구조화 출력: chosenExerciseId를 후보 id들의 enum으로 강제한다.
      // 후보 밖의 운동은 애초에 값으로 나올 수 없어 환각이 원천 차단된다.
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              chosenExerciseId: { type: 'integer', enum: candidateIds },
            },
            required: ['chosenExerciseId'],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: 'user',
          content:
            `사용자가 "${originalName}" 운동을 하려다 "${painBodyPart}" 부위에 통증을 보고했습니다. ` +
            `아래는 같은 부위를 단련하면서 통증 관절을 쓰지 않는 대체 운동 후보입니다. ` +
            `이 중 가장 적절한 대체 운동 하나의 id를 골라주세요.\n\n${candidateList}`,
        },
      ],
    })

    // output_config.format을 쓰면 첫 text 블록이 스키마를 만족하는 JSON이다.
    const text = response.content.find((b) => b.type === 'text')?.text
    if (!text) return null
    const parsed = JSON.parse(text)
    return candidateIds.includes(parsed.chosenExerciseId)
      ? parsed.chosenExerciseId
      : null
  } catch {
    // 네트워크 오류·키 문제 등 어떤 실패든 폴백으로 넘긴다 — 통증 보고 전체가 죽지 않게.
    return null
  }
}
