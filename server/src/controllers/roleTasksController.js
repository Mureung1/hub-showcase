import { supabase } from '../lib/supabaseClient.js'

async function findRole(token, roleId) {
  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('id')
    .eq('link_token', token)
    .single()

  if (letterError) return { error: { status: 404, message: '모임을 찾을 수 없어요' } }

  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('id', roleId)
    .eq('letter_id', letter.id)
    .single()

  if (roleError) return { error: { status: 404, message: '역할을 찾을 수 없어요' } }

  return { role }
}

// GET /api/letters/:token/roles/:roleId/tasks — 역할의 업무 목록 조회
export async function getTasksByRole(req, res) {
  const { error } = await findRole(req.params.token, req.params.roleId)
  if (error) return res.status(error.status).json({ data: null, error: error.message })

  const { data, error: tasksError } = await supabase
    .from('role_tasks')
    .select('*')
    .eq('role_id', req.params.roleId)
    .order('position', { ascending: true })

  if (tasksError) return res.status(500).json({ data: null, error: tasksError.message })

  res.json({ data, error: null })
}

// POST /api/letters/:token/roles/:roleId/tasks — 업무 일괄/단건 생성
export async function createTasks(req, res) {
  const { labels } = req.body

  if (!Array.isArray(labels) || labels.length === 0) {
    return res.status(400).json({ data: null, error: '필수 항목이 비어있어요' })
  }

  const { error } = await findRole(req.params.token, req.params.roleId)
  if (error) return res.status(error.status).json({ data: null, error: error.message })

  const rows = labels.map((label, i) => ({ role_id: req.params.roleId, label, position: i }))

  const { data, error: insertError } = await supabase.from('role_tasks').insert(rows).select()

  if (insertError) return res.status(500).json({ data: null, error: insertError.message })

  res.status(201).json({ data, error: null })
}

// PATCH /api/letters/:token/roles/:roleId/tasks/:taskId — 업무 완료 토글·수정
export async function updateTask(req, res) {
  const { label, done, position } = req.body
  const fields = { label, done, position }
  const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined))

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ data: null, error: '수정할 항목이 없어요' })
  }

  const { error } = await findRole(req.params.token, req.params.roleId)
  if (error) return res.status(error.status).json({ data: null, error: error.message })

  const { data, error: updateError } = await supabase
    .from('role_tasks')
    .update(updates)
    .eq('id', req.params.taskId)
    .eq('role_id', req.params.roleId)
    .select()
    .single()

  if (updateError) return res.status(500).json({ data: null, error: updateError.message })

  res.json({ data, error: null })
}

// DELETE /api/letters/:token/roles/:roleId/tasks/:taskId — 업무 삭제
export async function deleteTask(req, res) {
  const { error } = await findRole(req.params.token, req.params.roleId)
  if (error) return res.status(error.status).json({ data: null, error: error.message })

  const { error: deleteError } = await supabase
    .from('role_tasks')
    .delete()
    .eq('id', req.params.taskId)
    .eq('role_id', req.params.roleId)

  if (deleteError) return res.status(500).json({ data: null, error: deleteError.message })

  res.json({ data: { id: req.params.taskId }, error: null })
}
