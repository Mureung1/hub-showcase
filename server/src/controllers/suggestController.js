import { supabase } from '../lib/supabaseClient.js'
import { chatJSON } from '../lib/groqClient.js'

const NO_RESPONSES_FALLBACK = {
  fallback: true,
  reason: '아직 참여자 응답이 없어서 추천을 만들 수 없어요',
}

const LLM_FAILURE_FALLBACK = {
  fallback: true,
  reason: '추천을 가져오지 못했어요',
}

const SYSTEM_PROMPT = `너는 모임 조율 에이전트야. 주어진 모임 주제, 후보 시간·장소, 참여자 응답(선택한 시간·장소, MBTI), 이미 정해진 역할 목록을 보고 시간·장소·역할 배정을 추천해.
역할은 이미 사람이 정해뒀어 — 새 역할을 만들거나 이름을 바꾸지 말고, 반드시 기존_역할_목록에 있는 id만 사용해서 그 역할에 누가 배정되면 좋을지만 추천해.
참여자가 직접 밝힌 MBTI가 있으면 그 성향에 맞는 역할에 배정한 뒤 reason에 근거로 언급해. MBTI가 없는 참여자는 시간·장소·업무 적합도만으로 배정해.
기존_역할_목록에서 업무있음이 false인 역할에는 모임 주제에 맞는 구체적인 업무를 2~4개 함께 제안해(tasks) — 실제로 해야 할 일 단위로 쪼개서 적어. 업무있음이 true인 역할은 tasks를 빈 배열로 둬.
사람 간 감정이나 관계를 판단하지 말고, 시간·장소·업무·참여자가 직접 밝힌 성향처럼 검증 가능한 근거만 사용해.

[언어 규칙 — 반드시 지켜야 함]
JSON의 모든 문자열 값(reason, tasks 전부)은 순수 한국어(한글)로만 써.
한자(중국어 간체/번체), 일본어(히라가나·가타카나), 러시아어(키릴 문자) 등 외국어 문자를 단 하나도 섞지 마.
고유명사가 아닌 이상 영어 단어도 쓰지 마.

실제로 나왔던 잘못된 출력 예시 — 이렇게 쓰면 안 됨:
- "여행 计划자" (한자 섞임) → 올바른 표기: "여행 계획자"
- "여행일정 作成" (한자 섞임) → 올바른 표기: "여행 일정 작성"
- "여행 行程 확인" (한자 섞임) → 올바른 표기: "여행 일정 확인"
- " необходим에 따라 리더를 지원" (키릴 문자 섞임) → 올바른 표기: "필요에 따라 리더를 지원"
- "스케줄 확인" 대신 "スケジュール 확인" (일본어 섞임) → 올바른 표기: "일정 확인"

반드시 아래 JSON 형식으로만 답해, 다른 텍스트는 포함하지 마:
{
  "suggested_slot_id": "후보 시간 중 하나의 id",
  "suggested_slot_reason": "근거",
  "suggested_location_id": "후보 장소 중 하나의 id",
  "suggested_location_reason": "근거",
  "role_suggestions": [
    { "role_id": "기존_역할_목록 중 하나의 id", "assignee_participant_id": "참여자 id 또는 null", "reason": "근거", "tasks": ["구체적 업무1", "구체적 업무2"] }
  ]
}`

// POST /api/letters/:token/suggest — 시간·장소·역할 배정 추천
export async function suggestForLetter(req, res) {
  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('id, title, topic, candidate_slots, candidate_locations')
    .eq('link_token', req.params.token)
    .single()

  if (letterError) return res.status(404).json({ data: null, error: '모임을 찾을 수 없어요' })

  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('id, name, status, responses(selected_slot_ids, selected_location_ids, personality_type)')
    .eq('letter_id', letter.id)

  if (participantsError) return res.status(500).json({ data: null, error: participantsError.message })

  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('*, role_tasks(id)')
    .eq('letter_id', letter.id)
    .order('position', { ascending: true })

  if (rolesError) return res.status(500).json({ data: null, error: rolesError.message })

  const hasAnyResponse = participants.some((p) => p.responses)
  if (!hasAnyResponse) {
    return res.json({ data: NO_RESPONSES_FALLBACK, error: null })
  }

  const prompt = buildPrompt({ letter, participants, roles })

  let suggestion
  try {
    suggestion = await chatJSON([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ])
  } catch {
    return res.json({ data: LLM_FAILURE_FALLBACK, error: null })
  }

  res.json({ data: suggestion, error: null })
}

function buildPrompt({ letter, participants, roles }) {
  return JSON.stringify({
    모임: { 제목: letter.title, 주제: letter.topic },
    후보_시간: letter.candidate_slots,
    후보_장소: letter.candidate_locations,
    참여자_응답: participants.map((p) => ({
      id: p.id,
      이름: p.name,
      선택한_시간: p.responses?.selected_slot_ids ?? [],
      선택한_장소: p.responses?.selected_location_ids ?? [],
      MBTI: p.responses?.personality_type ?? null,
    })),
    기존_역할_목록: roles.map((r) => ({ id: r.id, 이름: r.name, 배정자: r.assignee_id, 업무있음: (r.role_tasks?.length ?? 0) > 0 })),
  })
}
