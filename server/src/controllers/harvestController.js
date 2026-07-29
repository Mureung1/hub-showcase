import { supabase } from '../lib/supabaseClient.js'

// POST /api/letters/:token/harvest-reviews — 결산 평가 제출(참여자 1명당 1개, 재제출 시 갱신)
export async function createOrUpdateReview(req, res) {
  const { participant_name, time_rating, place_rating, role_rating, comment } = req.body

  if (!participant_name || !time_rating || !place_rating || !role_rating) {
    return res.status(400).json({ data: null, error: '필수 항목이 비어있어요' })
  }

  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('id')
    .eq('link_token', req.params.token)
    .single()

  if (letterError) return res.status(404).json({ data: null, error: '모임을 찾을 수 없어요' })

  // participants 행 준비 — responsesController.createResponse와 동일한 조회-후-생성 패턴
  const { data: existingParticipant, error: existingError } = await supabase
    .from('participants')
    .select('id')
    .eq('letter_id', letter.id)
    .eq('name', participant_name)
    .maybeSingle()

  if (existingError) return res.status(500).json({ data: null, error: existingError.message })

  let participant = existingParticipant
  if (!participant) {
    const { data, error } = await supabase
      .from('participants')
      .insert({ letter_id: letter.id, name: participant_name })
      .select()
      .single()
    if (error) return res.status(500).json({ data: null, error: error.message })
    participant = data
  }

  const { data: existingReview, error: existingReviewError } = await supabase
    .from('harvest_reviews')
    .select('id')
    .eq('letter_id', letter.id)
    .eq('participant_id', participant.id)
    .maybeSingle()

  if (existingReviewError) return res.status(500).json({ data: null, error: existingReviewError.message })

  const fields = { time_rating, place_rating, role_rating, comment: comment || null }

  if (existingReview) {
    const { data, error } = await supabase
      .from('harvest_reviews')
      .update(fields)
      .eq('id', existingReview.id)
      .select()
      .single()
    if (error) return res.status(500).json({ data: null, error: error.message })
    return res.json({ data, error: null })
  }

  const { data, error } = await supabase
    .from('harvest_reviews')
    .insert({ letter_id: letter.id, participant_id: participant.id, ...fields })
    .select()
    .single()

  if (error) return res.status(500).json({ data: null, error: error.message })

  res.status(201).json({ data, error: null })
}

// GET /api/letters/:token/harvest-reviews — 결산 평가 목록 조회(평균은 클라이언트에서 계산)
export async function getReviews(req, res) {
  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('id')
    .eq('link_token', req.params.token)
    .single()

  if (letterError) return res.status(404).json({ data: null, error: '모임을 찾을 수 없어요' })

  const { data, error } = await supabase
    .from('harvest_reviews')
    .select('*')
    .eq('letter_id', letter.id)

  if (error) return res.status(500).json({ data: null, error: error.message })

  res.json({ data, error: null })
}
