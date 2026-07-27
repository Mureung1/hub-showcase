import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'

/* 배정 설명자 — 플래닝 에이전트가 역할 배정 결과를 "팀 단위"로 설명한다.
   ★ 공정성 제약: Claude에는 개인 설문·개인 배정을 절대 보내지 않는다. 오직 집계 통계(stats)와 역할명만.
   실패·키 없음·거부 시 null을 반환하고, 화면은 규칙 기반 요약으로 폴백한다. */

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8'

const SYSTEM_PROMPT = `당신은 대학생 팀 프로젝트의 역할 배정 결과를 팀 전체에 설명하는 중립적 중재자입니다.
- 개인의 설문 응답이나 특정 개인의 배정 이유는 절대 언급하지 마세요. 팀 전체 관점의 서술만 합니다.
- 한국어로 2~4문장. 배정이 공정하고 합리적인 이유(선호·경험 반영, 조장 처리)를 담습니다.
- 기피 응답에도 배정된 역할이나 팀 전원이 기피한 역할이 있으면, 마지막에 타협안(로테이션·해당 역할 담당자의 다른 업무 경감 등)을 한 문장으로 제안합니다.
- 담백하고 따뜻한 톤. 과장·이모지·머리말("안녕하세요" 등) 없이 설명만.`

function statsToText({ stats, roleNames }) {
  return [
    `팀원 수: ${stats.total}명`,
    `선호 역할을 받은 인원: ${stats.matchedPref}명`,
    `경험 있는 역할에 배정된 인원: ${stats.expMatched}명`,
    `조장 지원자 있음: ${stats.leaderVolunteer ? '예' : '아니오'}`,
    `기피 응답에도 배정된 역할: ${stats.forcedNames?.length ? stats.forcedNames.join(', ') : '없음'}`,
    `팀 전원이 기피한 역할: ${stats.fullyAvoidedNames?.length ? stats.fullyAvoidedNames.join(', ') : '없음'}`,
    `전체 역할 목록: ${roleNames.join(', ')}`,
  ].join('\n')
}

/**
 * 배정 결과를 팀 단위로 설명한다.
 * @param {{ stats: object, roleNames: string[] }} input - stats는 집계값만(개인 데이터 없음)
 * @returns {Promise<string|null>} 설명 문자열, 또는 null(→ 화면이 규칙 요약으로 폴백)
 */
export async function explainAssignment({ stats, roleNames }) {
  if (!process.env.ANTHROPIC_API_KEY || !stats) return null
  try {
    const client = new Anthropic()
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: 'low' }, // 짧은 산문이라 빠르게
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: statsToText({ stats, roleNames }) }],
    })
    if (res.stop_reason === 'refusal') return null
    const block = res.content.find((b) => b.type === 'text')
    const text = block?.text?.trim()
    return text || null
  } catch (err) {
    // 배정 자체는 절대 실패하지 않도록, 어떤 오류든 삼키고 규칙 요약으로 폴백
    console.warn(`[explainer] 배정 설명 생성 실패, 규칙 요약으로 폴백: ${err.message}`)
    return null
  }
}
