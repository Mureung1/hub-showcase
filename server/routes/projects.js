import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { supabase } from '../db/supabase.js'
import { userIdFromReq } from '../lib/auth.js'
import { generatePlan } from '../services/planner.js'
import { explainAssignment } from '../services/explainer.js'
import { assignRoles, computeTeamStats } from '../../src/logic/assignRoles.js'
import { parseDate, toDateInputValue } from '../../src/utils/dates.js'

// 쿠키의 JWT에서 로그인 사용자를 확인한다. 미로그인이면 401을 던진다. (me.js와 동일 패턴)
async function currentUser(req) {
  const userId = userIdFromReq(req)
  if (!userId) throw fail(401, '로그인이 필요합니다.')
  const { data, error } = await supabase
    .from('users')
    .select('id, username, name')
    .eq('id', userId)
    .single()
  if (error) throw new Error(`사용자 조회 실패: ${error.message}`)
  return data
}

function throwIf(error, where) {
  if (error) throw new Error(`${where}: ${error.message}`)
}

// 상태 코드를 담은 에러 (catch에서 res.status로 사용)
function fail(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

// 프로젝트를 조회하고 생성자 본인인지 확인한다 (아니면 403/404/401). columns에 creator_id 포함 필수.
async function loadCreatorProject(req, columns) {
  const user = await currentUser(req)
  const { data: project, error } = await supabase
    .from('projects')
    .select(columns)
    .eq('id', req.params.id)
    .maybeSingle()
  throwIf(error, '프로젝트 조회')
  if (!project) throw fail(404, '프로젝트를 찾을 수 없습니다.')
  if (project.creator_id !== user.id) throw fail(403, '생성자만 접근할 수 있습니다.')
  return { user, project }
}

// 로그인 사용자가 그 프로젝트의 팀원인지 확인한다 (아니면 403/401). 설문 등 멤버 전용 라우트용.
async function loadMember(req) {
  const user = await currentUser(req)
  const { data: member, error } = await supabase
    .from('project_members')
    .select('id, projects(id, title, headcount, status, creator_id)')
    .eq('project_id', req.params.id)
    .eq('user_id', user.id)
    .maybeSingle()
  throwIf(error, '팀원 확인')
  if (!member || !member.projects) throw fail(403, '이 프로젝트의 팀원만 참여할 수 있습니다.')
  return { user, member, project: member.projects }
}

// 계획(역할·마일스톤·태스크)을 프로젝트에 저장한다. 생성·재생성이 공유.
async function savePlan(projectId, plan) {
  // 역할 — 벌크 insert 후 반환 순서(=입력 순서)로 slug→uuid 매핑
  const { data: insertedRoles, error: er } = await supabase
    .from('roles')
    .insert(
      plan.roles.map((r, i) => ({
        project_id: projectId,
        name: r.name,
        description: r.description,
        emoji: r.emoji,
        min_count: r.min,
        max_count: r.max,
        is_leader_role: r.isLeader,
        sort_order: i,
      })),
    )
    .select('id')
  throwIf(er, '역할 저장')
  const roleIdBySlug = new Map(plan.roles.map((r, i) => [r.id, insertedRoles[i].id]))

  // 마일스톤
  const { data: insertedMs, error: em } = await supabase
    .from('milestones')
    .insert(
      plan.milestones.map((m, i) => ({
        project_id: projectId,
        title: m.title,
        due_date: m.dueDate,
        sort_order: i,
      })),
    )
    .select('id')
  throwIf(em, '마일스톤 저장')
  const msIdBySlug = new Map(plan.milestones.map((m, i) => [m.id, insertedMs[i].id]))

  // 태스크 (계획 시점엔 사람이 아닌 역할에 연결)
  const taskRows = []
  plan.milestones.forEach((m) => {
    m.tasks.forEach((t, j) => {
      taskRows.push({
        project_id: projectId,
        milestone_id: msIdBySlug.get(m.id),
        role_id: roleIdBySlug.get(t.roleId) ?? null,
        title: t.title,
        sort_order: j,
      })
    })
  })
  if (taskRows.length > 0) {
    const { error: et } = await supabase.from('tasks').insert(taskRows)
    throwIf(et, '태스크 저장')
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const projects = Router()

// ── 프로젝트 생성: 위저드 제출 → projects + 멤버 + 기피날짜 + 계획(역할·마일스톤·태스크) ──
projects.post('/api/projects', async (req, res) => {
  try {
    const user = await currentUser(req)

    // 1) 입력 검증
    const { title, topic, typeHint, deadline, avoidDates, headcount } = req.body ?? {}
    if (typeof title !== 'string' || title.trim().length === 0) throw fail(400, '제목을 입력해 주세요.')
    if (typeof topic !== 'string' || topic.trim().length === 0 || topic.length > 200) {
      throw fail(400, '주제는 1~200자로 입력해 주세요.')
    }
    if (typeof deadline !== 'string' || !DATE_RE.test(deadline)) throw fail(400, '마감일이 올바르지 않습니다.')
    if (parseDate(deadline) <= parseDate(toDateInputValue(new Date()))) {
      throw fail(400, '마감일은 미래 날짜여야 합니다.')
    }
    if (!Number.isInteger(headcount) || headcount < 3 || headcount > 8) {
      throw fail(400, '팀원 수는 3~8명이어야 합니다.')
    }
    const type = typeof typeHint === 'string' ? typeHint : null
    const avoid = Array.isArray(avoidDates)
      ? avoidDates.filter((d) => typeof d === 'string' && DATE_RE.test(d))
      : []

    // 2) 프로젝트 행
    const { data: project, error: e1 } = await supabase
      .from('projects')
      .insert({
        creator_id: user.id,
        title: title.trim(),
        topic: topic.trim(),
        type_hint: type,
        deadline,
        headcount,
        status: 'planning',
        regen_count: 0,
      })
      .select('id')
      .single()
    throwIf(e1, '프로젝트 생성')
    const projectId = project.id

    // 3) 생성자를 팀원으로 등록 — 첫 프로젝트면 메인으로 지정
    const { count: memberCount, error: e2 } = await supabase
      .from('project_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    throwIf(e2, '멤버십 조회')
    const { error: e3 } = await supabase.from('project_members').insert({
      project_id: projectId,
      user_id: user.id,
      nickname: user.name,
      is_main: (memberCount ?? 0) === 0,
      sort_order: 0,
    })
    throwIf(e3, '팀원 등록')

    // 4) 기피 날짜
    if (avoid.length > 0) {
      const { error: e4 } = await supabase
        .from('avoid_dates')
        .insert(avoid.map((date) => ({ project_id: projectId, date })))
      throwIf(e4, '기피 날짜 저장')
    }

    // 5) 플래너 에이전트 (Claude 또는 템플릿 폴백)
    const plan = await generatePlan({
      title: title.trim(),
      topic: topic.trim(),
      typeHint: type,
      deadline,
      headcount,
      avoidDates: avoid,
    })

    // 6) 계획(역할·마일스톤·태스크) 저장
    await savePlan(projectId, plan)

    res.status(201).json({ id: projectId })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 계획 조회: 생성자 전용. PlanReview 화면이 이 모양 그대로 사용한다 ──
projects.get('/api/projects/:id/plan', async (req, res) => {
  try {
    const user = await currentUser(req)

    const { data: project, error: e1 } = await supabase
      .from('projects')
      .select('id, title, topic, type_hint, deadline, headcount, regen_count, status, creator_id')
      .eq('id', req.params.id)
      .maybeSingle()
    throwIf(e1, '프로젝트 조회')
    if (!project) throw fail(404, '프로젝트를 찾을 수 없습니다.')
    if (project.creator_id !== user.id) throw fail(403, '생성자만 계획을 볼 수 있습니다.')

    const { data: roles, error: e2 } = await supabase
      .from('roles')
      .select('id, name, emoji, description, min_count, max_count, is_leader_role')
      .eq('project_id', project.id)
      .order('sort_order')
    throwIf(e2, '역할 조회')

    const { data: milestones, error: e3 } = await supabase
      .from('milestones')
      .select('id, title, due_date')
      .eq('project_id', project.id)
      .order('sort_order')
    throwIf(e3, '마일스톤 조회')

    const { data: tasks, error: e4 } = await supabase
      .from('tasks')
      .select('id, milestone_id, role_id, title, sort_order')
      .eq('project_id', project.id)
      .order('sort_order')
    throwIf(e4, '태스크 조회')

    const { count: avoidCount, error: e5 } = await supabase
      .from('avoid_dates')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
    throwIf(e5, '기피 날짜 조회')

    res.json({
      project: {
        title: project.title,
        topic: project.topic,
        typeHint: project.type_hint,
        deadline: project.deadline,
        headcount: project.headcount,
        avoidCount: avoidCount ?? 0,
        regenCount: project.regen_count,
        status: project.status,
      },
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        description: r.description,
        min: r.min_count,
        max: r.max_count,
        isLeader: r.is_leader_role,
      })),
      milestones: milestones.map((m) => ({
        id: m.id,
        title: m.title,
        dueDate: m.due_date,
        tasks: tasks
          .filter((t) => t.milestone_id === m.id)
          .map((t) => ({ id: t.id, title: t.title, roleId: t.role_id })),
      })),
    })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 계획 재생성: 생성자가 계획을 다시 제안받는다 (planning 상태, 최대 3회) ──
projects.post('/api/projects/:id/regenerate', async (req, res) => {
  try {
    const { project } = await loadCreatorProject(
      req,
      'id, title, topic, type_hint, deadline, headcount, regen_count, status, creator_id',
    )
    if (project.status !== 'planning') throw fail(409, '확정된 계획은 다시 제안받을 수 없습니다.')
    if (project.regen_count >= 3) throw fail(400, '재생성 횟수(3회)를 모두 사용했습니다.')

    const { data: avoid, error: ea } = await supabase
      .from('avoid_dates')
      .select('date')
      .eq('project_id', project.id)
    throwIf(ea, '기피 날짜 조회')

    const plan = await generatePlan({
      title: project.title,
      topic: project.topic,
      typeHint: project.type_hint,
      deadline: project.deadline,
      headcount: project.headcount,
      avoidDates: avoid.map((a) => a.date),
    })

    // 기존 계획 제거 (태스크 → 마일스톤 → 역할 순) 후 새 계획 저장
    for (const table of ['tasks', 'milestones', 'roles']) {
      const { error } = await supabase.from(table).delete().eq('project_id', project.id)
      throwIf(error, `${table} 삭제`)
    }
    await savePlan(project.id, plan)

    const nextCount = project.regen_count + 1
    const { error: eu } = await supabase
      .from('projects')
      .update({ regen_count: nextCount })
      .eq('id', project.id)
    throwIf(eu, '재생성 횟수 갱신')

    res.json({ regenCount: nextCount })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 계획 확정: 인라인 수정 반영 + 초대 토큰 발급 + 모집(recruiting) 상태 전환 ──
projects.post('/api/projects/:id/confirm', async (req, res) => {
  try {
    const { project } = await loadCreatorProject(req, 'id, status, invite_token, creator_id')

    // 이미 확정됨 → 같은 토큰 반환 (재클릭 안전, 멱등)
    if (project.status === 'recruiting' && project.invite_token) {
      return res.json({ inviteToken: project.invite_token })
    }
    if (project.status !== 'planning') throw fail(409, '확정할 수 없는 상태입니다.')

    // 인라인 수정 저장 — 이름/제목만, 프로젝트 범위로 갱신
    const body = req.body ?? {}
    const updates = []
    for (const r of Array.isArray(body.roles) ? body.roles : []) {
      if (r?.id && typeof r.name === 'string') {
        updates.push(supabase.from('roles').update({ name: r.name }).eq('id', r.id).eq('project_id', project.id))
      }
    }
    for (const m of Array.isArray(body.milestones) ? body.milestones : []) {
      if (m?.id && typeof m.title === 'string') {
        updates.push(supabase.from('milestones').update({ title: m.title }).eq('id', m.id).eq('project_id', project.id))
      }
    }
    for (const t of Array.isArray(body.tasks) ? body.tasks : []) {
      if (t?.id && typeof t.title === 'string') {
        updates.push(supabase.from('tasks').update({ title: t.title }).eq('id', t.id).eq('project_id', project.id))
      }
    }
    for (const { error } of await Promise.all(updates)) throwIf(error, '계획 수정 저장')

    // 초대 토큰 발급 (unique 충돌 시 재시도)
    let inviteToken = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const token = randomBytes(9).toString('base64url')
      const { data: updated, error } = await supabase
        .from('projects')
        .update({ invite_token: token, status: 'recruiting' })
        .eq('id', project.id)
        .select('invite_token')
        .single()
      if (!error) {
        inviteToken = updated.invite_token
        break
      }
      if (error.code !== '23505') throwIf(error, '초대 토큰 발급') // 23505=unique 위반이면 재시도
    }
    if (!inviteToken) throw fail(500, '초대 토큰 발급에 실패했습니다. 다시 시도해 주세요.')

    res.json({ inviteToken })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 초대 화면용 데이터: 초대 토큰 + 참여 현황 (생성자 전용) ──
projects.get('/api/projects/:id/invite', async (req, res) => {
  try {
    const { project } = await loadCreatorProject(
      req,
      'id, title, headcount, status, invite_token, creator_id',
    )
    const { data: members, error } = await supabase
      .from('project_members')
      .select('nickname, user_id, joined_at')
      .eq('project_id', project.id)
      .order('joined_at')
    throwIf(error, '팀원 조회')

    res.json({
      title: project.title,
      headcount: project.headcount,
      status: project.status,
      inviteToken: project.invite_token,
      joinedCount: members.length,
      members: members.map((m) => ({
        nickname: m.nickname,
        isCreator: m.user_id === project.creator_id,
      })),
    })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 설문 조회: 프로젝트 역할 + 제출 현황 (팀원 전용) ──
projects.get('/api/projects/:id/survey', async (req, res) => {
  try {
    const { user, member, project } = await loadMember(req)

    const { data: roles, error: e1 } = await supabase
      .from('roles')
      .select('id, name, emoji, is_leader_role')
      .eq('project_id', project.id)
      .order('sort_order')
    throwIf(e1, '역할 조회')

    const { count: memberCount, error: e2 } = await supabase
      .from('project_members')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
    throwIf(e2, '팀원 수 조회')

    const { count: submittedCount, error: e3 } = await supabase
      .from('surveys')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
    throwIf(e3, '제출 수 조회')

    const { data: mine, error: e4 } = await supabase
      .from('surveys')
      .select('id')
      .eq('project_id', project.id)
      .eq('member_id', member.id)
      .maybeSingle()
    throwIf(e4, '내 설문 조회')

    res.json({
      project: { title: project.title, headcount: project.headcount, status: project.status },
      isCreator: project.creator_id === user.id,
      roles: roles.map((r) => ({ id: r.id, name: r.name, emoji: r.emoji, isLeader: r.is_leader_role })),
      memberCount: memberCount ?? 0,
      submittedCount: submittedCount ?? 0,
      mySubmitted: Boolean(mine),
    })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 설문 제출: 팀원이 성향 설문을 낸다 (모집 중, 재제출 시 덮어씀) ──
const LEADER_VALUES = new Set(['yes', 'no', 'any'])
projects.post('/api/projects/:id/survey', async (req, res) => {
  try {
    const { member, project } = await loadMember(req)
    if (project.status !== 'recruiting') throw fail(409, '설문을 제출할 수 있는 단계가 아닙니다.')

    const { data: roles, error: er } = await supabase
      .from('roles')
      .select('id')
      .eq('project_id', project.id)
    throwIf(er, '역할 조회')
    const roleIds = new Set(roles.map((r) => r.id))

    const body = req.body ?? {}
    const avoid = body.avoid ?? null
    const leader = body.leader
    const experience = [...new Set(Array.isArray(body.experience) ? body.experience : [])]
    // 선호는 중복 제거 + 기피로 고른 역할은 선호에서 제외(모순 방지)
    const preferences = [...new Set(Array.isArray(body.preferences) ? body.preferences : [])].filter((id) => id !== avoid)

    if (!LEADER_VALUES.has(leader)) throw fail(400, '리더 의향 값이 올바르지 않습니다.')
    if (preferences.length > 3) throw fail(400, '선호 역할은 최대 3개까지입니다.')
    for (const id of [...preferences, ...experience]) {
      if (!roleIds.has(id)) throw fail(400, '설문의 역할이 프로젝트 역할과 맞지 않습니다.')
    }
    if (avoid !== null && !roleIds.has(avoid)) throw fail(400, '기피 역할이 프로젝트 역할과 맞지 않습니다.')

    const { error: eu } = await supabase.from('surveys').upsert(
      { project_id: project.id, member_id: member.id, answers: { preferences, avoid, experience, leader } },
      { onConflict: 'project_id,member_id' },
    )
    throwIf(eu, '설문 저장')

    const { count: submittedCount, error: ec } = await supabase
      .from('surveys')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
    throwIf(ec, '제출 수 조회')

    res.status(201).json({ ok: true, submittedCount: submittedCount ?? 0 })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 배정 실행: 생성자가 설문을 마감하고 결정적 점수 로직으로 역할을 배정·공개한다 ──
projects.post('/api/projects/:id/assign', async (req, res) => {
  try {
    const { project } = await loadCreatorProject(req, 'id, status, creator_id')
    if (project.status !== 'recruiting') throw fail(409, '배정할 수 있는 단계가 아닙니다.')

    // 설문 제출자 = 참여자 (미제출자는 배정에서 제외)
    const { data: surveys, error: es } = await supabase
      .from('surveys')
      .select('member_id, answers')
      .eq('project_id', project.id)
    throwIf(es, '설문 조회')
    if (surveys.length < 1) throw fail(400, '설문을 제출한 팀원이 없습니다.')

    const { data: roleRows, error: erl } = await supabase
      .from('roles')
      .select('id, name, min_count, max_count, is_leader_role')
      .eq('project_id', project.id)
      .order('sort_order')
    throwIf(erl, '역할 조회')

    // assignRoles 입력 형태로 변환 (역할은 UUID, isLeader로 조장 판정)
    const participants = surveys.map((s) => ({ id: s.member_id }))
    const surveyMap = Object.fromEntries(surveys.map((s) => [s.member_id, s.answers]))
    const roles = roleRows.map((r) => ({
      id: r.id,
      name: r.name,
      min: r.min_count,
      max: r.max_count,
      isLeader: r.is_leader_role,
    }))

    const result = assignRoles(participants, surveyMap, roles)
    const stats = computeTeamStats(participants, surveyMap, roles, result)
    // 플래닝 에이전트가 배정 이유를 팀 단위로 설명 (집계값만 전달; 실패 시 null → 화면이 규칙 요약 폴백)
    const summary = await explainAssignment({ stats, roleNames: roles.map((r) => r.name) })

    // 기존 배정 삭제 후 재저장 — 한 사람의 여러 역할을 각각 1행으로
    const { error: ed } = await supabase.from('assignments').delete().eq('project_id', project.id)
    throwIf(ed, '기존 배정 삭제')
    const rows = []
    for (const [memberId, roleIds] of Object.entries(result.byMember)) {
      for (const roleId of roleIds) rows.push({ project_id: project.id, member_id: memberId, role_id: roleId })
    }
    if (rows.length > 0) {
      const { error: ei } = await supabase.from('assignments').insert(rows)
      throwIf(ei, '배정 저장')
    }

    const { error: eu } = await supabase
      .from('projects')
      .update({
        status: 'assigned',
        revealed_at: new Date().toISOString(),
        assignment_stats: stats,
        assignment_summary: summary,
      })
      .eq('id', project.id)
    throwIf(eu, '배정 상태 갱신')

    res.json({ ok: true })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 배정 결과 조회: 팀원별 역할 + 규칙 요약 통계 (팀원 전용) ──
projects.get('/api/projects/:id/result', async (req, res) => {
  try {
    const { user, project } = await loadMember(req)
    if (!['assigned', 'active', 'completed'].includes(project.status)) {
      throw fail(409, '아직 배정 결과가 없습니다.')
    }

    const { data: proj, error: ep } = await supabase
      .from('projects')
      .select('title, status, revealed_at, swap_used, assignment_stats, assignment_summary, creator_id')
      .eq('id', project.id)
      .single()
    throwIf(ep, '프로젝트 조회')

    const { data: members, error: em } = await supabase
      .from('project_members')
      .select('id, nickname, user_id, joined_at')
      .eq('project_id', project.id)
      .order('joined_at')
    throwIf(em, '팀원 조회')

    const { data: assignments, error: ea } = await supabase
      .from('assignments')
      .select('member_id, roles(name, emoji, is_leader_role)')
      .eq('project_id', project.id)
    throwIf(ea, '배정 조회')

    const byMember = new Map()
    assignments.forEach((a) => {
      if (!byMember.has(a.member_id)) byMember.set(a.member_id, [])
      byMember.get(a.member_id).push(a.roles)
    })
    const leaderRole = assignments.map((a) => a.roles).find((r) => r?.is_leader_role) ?? null

    res.json({
      project: { title: proj.title, status: proj.status, revealedAt: proj.revealed_at },
      isCreator: user.id === proj.creator_id, // 뷰어가 생성자인가 (맞교환 UI 노출)
      swapUsed: proj.swap_used,
      leaderRole: leaderRole ? { name: leaderRole.name, emoji: leaderRole.emoji } : null,
      members: members.map((m) => {
        const rs = byMember.get(m.id) ?? []
        return {
          id: m.id,
          nickname: m.nickname,
          isCreator: m.user_id === proj.creator_id,
          isLeader: rs.some((r) => r?.is_leader_role),
          roles: rs.filter((r) => !r?.is_leader_role).map((r) => ({ name: r.name, emoji: r.emoji })),
        }
      }),
      stats: proj.assignment_stats,
      summary: proj.assignment_summary,
    })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 역할 맞교환: 공개 후 10분 내, 생성자가 두 팀원의 실무 역할을 1회 맞교환 ──
projects.post('/api/projects/:id/swap', async (req, res) => {
  try {
    const { project } = await loadCreatorProject(req, 'id, status, revealed_at, swap_used, creator_id')
    if (project.status !== 'assigned') throw fail(409, '배정 공개 후에만 맞교환할 수 있습니다.')
    if (project.swap_used) throw fail(409, '역할 맞교환은 한 번만 가능합니다.')
    const revealed = project.revealed_at ? new Date(project.revealed_at).getTime() : 0
    if (!revealed || Date.now() - revealed > 10 * 60 * 1000) {
      throw fail(409, '맞교환 가능 시간(공개 후 10분)이 지났습니다.')
    }

    const { memberA, memberB } = req.body ?? {}
    if (!memberA || !memberB || memberA === memberB) throw fail(400, '서로 다른 두 팀원을 선택해 주세요.')

    const { data: mems, error: e1 } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', project.id)
      .in('id', [memberA, memberB])
    throwIf(e1, '팀원 확인')
    if (mems.length !== 2) throw fail(400, '선택한 팀원을 찾을 수 없습니다.')

    // 두 팀원의 실무 역할(조장 제외)만 조회 → 교차 저장 (조장 표식은 각자 유지)
    const { data: rows, error: e2 } = await supabase
      .from('assignments')
      .select('member_id, role_id, roles(is_leader_role)')
      .eq('project_id', project.id)
      .in('member_id', [memberA, memberB])
    throwIf(e2, '배정 조회')
    const workA = rows.filter((r) => r.member_id === memberA && !r.roles?.is_leader_role).map((r) => r.role_id)
    const workB = rows.filter((r) => r.member_id === memberB && !r.roles?.is_leader_role).map((r) => r.role_id)

    if (workA.length > 0) {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('project_id', project.id)
        .eq('member_id', memberA)
        .in('role_id', workA)
      throwIf(error, 'A 역할 제거')
    }
    if (workB.length > 0) {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('project_id', project.id)
        .eq('member_id', memberB)
        .in('role_id', workB)
      throwIf(error, 'B 역할 제거')
    }
    const swapRows = [
      ...workB.map((roleId) => ({ project_id: project.id, member_id: memberA, role_id: roleId })),
      ...workA.map((roleId) => ({ project_id: project.id, member_id: memberB, role_id: roleId })),
    ]
    if (swapRows.length > 0) {
      const { error } = await supabase.from('assignments').insert(swapRows)
      throwIf(error, '역할 교차 저장')
    }

    const { error: e3 } = await supabase.from('projects').update({ swap_used: true }).eq('id', project.id)
    throwIf(e3, '맞교환 상태 갱신')
    await supabase.from('activity_log').insert({ project_id: project.id, member_id: memberA, type: 'swap' })

    res.json({ ok: true })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})
