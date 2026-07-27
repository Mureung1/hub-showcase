import { supabase } from '../lib/supabaseClient.js'

// GET /api/letters/:token/roles — 역할 목록 조회
export async function getRolesByToken(req, res) {
  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('id')
    .eq('link_token', req.params.token)
    .single()

  if (letterError) return res.status(404).json({ data: null, error: '모임을 찾을 수 없어요' })

  const { data, error } = await supabase
    .from('roles')
    .select('*, role_tasks(*)')
    .eq('letter_id', letter.id)
    .order('position', { ascending: true })

  if (error) return res.status(500).json({ data: null, error: error.message })

  // PostgREST 임베드 정렬 문법에 기대지 않고 컨트롤러에서 안전하게 정렬한다.
  for (const role of data) {
    role.role_tasks?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }

  res.json({ data, error: null })
}

// POST /api/letters/:token/roles — 역할 생성
export async function createRole(req, res) {
  const { name, reason, source, position, assignee_id } = req.body

  if (!name) {
    return res.status(400).json({ data: null, error: '필수 항목이 비어있어요' })
  }

  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('id')
    .eq('link_token', req.params.token)
    .single()

  if (letterError) return res.status(404).json({ data: null, error: '모임을 찾을 수 없어요' })

  const { data, error } = await supabase
    .from('roles')
    .insert({ letter_id: letter.id, name, reason, source, position, assignee_id })
    .select()
    .single()

  if (error) return res.status(500).json({ data: null, error: error.message })

  res.status(201).json({ data, error: null })
}

// PATCH /api/letters/:token/roles/:roleId — 역할에 참여자 배정(또는 필드 수정)
export async function updateRole(req, res) {
  const { assignee_id, done, name, reason, position } = req.body
  const fields = { assignee_id, done, name, reason, position }
  const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined))

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ data: null, error: '수정할 항목이 없어요' })
  }

  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('id')
    .eq('link_token', req.params.token)
    .single()

  if (letterError) return res.status(404).json({ data: null, error: '모임을 찾을 수 없어요' })

  const { data, error } = await supabase
    .from('roles')
    .update(updates)
    .eq('id', req.params.roleId)
    .eq('letter_id', letter.id)
    .select()
    .single()

  if (error) return res.status(500).json({ data: null, error: error.message })

  res.json({ data, error: null })
}
