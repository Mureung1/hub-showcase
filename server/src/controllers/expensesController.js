import { supabase } from '../lib/supabaseClient.js'

// POST /api/letters/:token/expenses — 지출 항목 추가
export async function createExpense(req, res) {
  const { label, amount, paid_by_participant_id } = req.body

  if (!label || !amount || !paid_by_participant_id) {
    return res.status(400).json({ data: null, error: '필수 항목이 비어있어요' })
  }

  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('id')
    .eq('link_token', req.params.token)
    .single()

  if (letterError) return res.status(404).json({ data: null, error: '모임을 찾을 수 없어요' })

  const { data, error } = await supabase
    .from('expenses')
    .insert({ letter_id: letter.id, label, amount, paid_by_participant_id })
    .select()
    .single()

  if (error) return res.status(500).json({ data: null, error: error.message })

  res.status(201).json({ data, error: null })
}

// GET /api/letters/:token/expenses — 지출 항목 목록 조회
export async function getExpenses(req, res) {
  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('id')
    .eq('link_token', req.params.token)
    .single()

  if (letterError) return res.status(404).json({ data: null, error: '모임을 찾을 수 없어요' })

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('letter_id', letter.id)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ data: null, error: error.message })

  res.json({ data, error: null })
}
