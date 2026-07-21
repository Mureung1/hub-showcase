import { supabase } from '../lib/supabaseClient.js'

// POST /api/letters/:token/responses — 참여자 응답 저장
export async function createResponse(req, res) {
  const { participant_name, selected_slot_ids, selected_location_ids } = req.body

  if (!participant_name || !selected_slot_ids?.length) {
    return res.status(400).json({ data: null, error: '필수 항목이 비어있어요' })
  }

  // 1. link_token으로 모임 찾기
  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('id')
    .eq('link_token', req.params.token)
    .single()

  if (letterError) return res.status(404).json({ data: null, error: '모임을 찾을 수 없어요' })

  // 2. participants 행 준비 — 초대 시 명단에 이미 있으면(participant_names) 그 행의 상태만 갱신하고,
  // 없으면 새로 생성한다. (갱신하지 않으면 같은 사람이 두 행으로 남아 응답 현황 집계가 부정확해진다.)
  const { data: existingParticipant, error: existingError } = await supabase
    .from('participants')
    .select('id')
    .eq('letter_id', letter.id)
    .eq('name', participant_name)
    .maybeSingle()

  if (existingError) return res.status(500).json({ data: null, error: existingError.message })

  let participant
  if (existingParticipant) {
    const { data, error } = await supabase
      .from('participants')
      .update({ status: '시간대 응답 완료' })
      .eq('id', existingParticipant.id)
      .select()
      .single()
    if (error) return res.status(500).json({ data: null, error: error.message })
    participant = data
  } else {
    const { data, error } = await supabase
      .from('participants')
      .insert({ letter_id: letter.id, name: participant_name, status: '시간대 응답 완료' })
      .select()
      .single()
    if (error) return res.status(500).json({ data: null, error: error.message })
    participant = data
  }

  // 3. responses 저장
  const { data: response, error: responseError } = await supabase
    .from('responses')
    .insert({
      participant_id: participant.id,
      selected_slot_ids,
      selected_location_ids: selected_location_ids || [],
    })
    .select()
    .single()

  if (responseError) return res.status(500).json({ data: null, error: responseError.message })

  res.status(201).json({ data: response, error: null })
}

// GET /api/letters/:token/responses — 응답 목록 조회
export async function getResponsesByToken(req, res) {
  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('id')
    .eq('link_token', req.params.token)
    .single()

  if (letterError) return res.status(404).json({ data: null, error: '모임을 찾을 수 없어요' })

  const { data, error } = await supabase
    .from('participants')
    .select('id, name, status, responses(selected_slot_ids, selected_location_ids)')
    .eq('letter_id', letter.id)

  if (error) return res.status(500).json({ data: null, error: error.message })

  res.json({ data, error: null })
}