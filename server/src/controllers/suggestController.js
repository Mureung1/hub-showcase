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

const SYSTEM_PROMPT = `너는 모임 조율 에이전트야. 주어진 후보 시간·장소와 참여자 응답, 역할 목록을 보고 시간·장소·역할을 추천해.
사람 간 감정이나 관계를 판단하지 말고, 시간·장소·업무처럼 검증 가능한 근거만 사용해.
반드시 아래 JSON 형식으로만 답해, 다른 텍스트는 포함하지 마:
{
  "suggested_slot_id": "후보 시간 중 하나의 id",
  "suggested_slot_reason": "근거",
  "suggested_location_id": "후보 장소 중 하나의 id",
  "suggested_location_reason": "근거",
  "role_suggestions": [
    { "name": "역할 이름", "reason": "근거", "assignee_participant_id": "참여자 id 또는 null" }
  ]
}`

// POST /api/letters/:token/suggest — 시간·장소·역할 추천
export async function suggestForLetter(req, res) {
  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('id, title, topic, candidate_slots, candidate_locations')
    .eq('link_token', req.params.token)
    .single()

  if (letterError) return res.status(404).json({ data: null, error: '모임을 찾을 수 없어요' })

  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('id, name, status, responses(selected_slot_ids, selected_location_ids)')
    .eq('letter_id', letter.id)

  if (participantsError) return res.status(500).json({ data: null, error: participantsError.message })

  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('*')
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
    })),
    기존_역할_목록: roles.map((r) => ({ id: r.id, 이름: r.name, 배정자: r.assignee_id })),
  })
}
