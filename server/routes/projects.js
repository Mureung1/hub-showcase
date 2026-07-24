import { Router } from 'express'
import { supabase } from '../db/supabase.js'
import { userIdFromReq } from '../lib/auth.js'
import { generatePlan } from '../services/planner.js'
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

    // 6) 역할 — 벌크 insert 후 반환 순서(=입력 순서)로 slug→uuid 매핑
    const { data: insertedRoles, error: e5 } = await supabase
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
    throwIf(e5, '역할 저장')
    const roleIdBySlug = new Map(plan.roles.map((r, i) => [r.id, insertedRoles[i].id]))

    // 7) 마일스톤
    const { data: insertedMs, error: e6 } = await supabase
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
    throwIf(e6, '마일스톤 저장')
    const msIdBySlug = new Map(plan.milestones.map((m, i) => [m.id, insertedMs[i].id]))

    // 8) 태스크 (계획 시점엔 사람이 아닌 역할에 연결)
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
      const { error: e7 } = await supabase.from('tasks').insert(taskRows)
      throwIf(e7, '태스크 저장')
    }

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
