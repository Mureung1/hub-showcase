import { Router } from 'express'
import { supabase } from '../db/supabase.js'
import { userIdFromReq } from '../lib/auth.js'

// 쿠키의 JWT에서 로그인 사용자를 확인한다. 미로그인이면 401을 던진다.
async function currentUser(req) {
  const userId = userIdFromReq(req)
  if (!userId) {
    const err = new Error('로그인이 필요합니다.')
    err.status = 401
    throw err
  }
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

// 태스크를 로드하고 요청자가 그 담당자인지 확인한다.
// 태스크 없으면 404, 이 프로젝트 팀원이 아니면 403, 내 태스크가 아니면 403.
// 상태 변경·자료 업로드가 공유하는 소유권 가드.
async function loadOwnTask(user, taskId) {
  const { data: task, error: e1 } = await supabase
    .from('tasks')
    .select('id, project_id, assignee_member_id, title, status')
    .eq('id', taskId)
    .maybeSingle()
  throwIf(e1, '태스크 조회')
  if (!task) throw fail(404, '태스크를 찾을 수 없습니다.')

  const { data: membership, error: e2 } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', task.project_id)
    .eq('user_id', user.id)
    .maybeSingle()
  throwIf(e2, '멤버 확인')
  if (!membership) throw fail(403, '이 프로젝트의 팀원이 아닙니다.')
  if (task.assignee_member_id !== membership.id) throw fail(403, '내 태스크만 변경할 수 있습니다.')
  return { task, membership }
}

// 링크 업로드용 URL 검증 — http/https만 허용. 상태코드 담긴 에러 throw.
function normalizeUrl(raw) {
  const url = String(raw ?? '').trim()
  if (!url) throw fail(400, 'URL을 입력해 주세요.')
  if (url.length > 2000) throw fail(400, 'URL이 너무 깁니다.')
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw fail(400, '올바른 URL이 아닙니다. (http:// 또는 https://)')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw fail(400, 'http 또는 https 링크만 올릴 수 있습니다.')
  }
  return url
}

// 태스크 배열 → 완료율(%)
function progressOf(tasks) {
  if (tasks.length === 0) return 0
  const done = tasks.filter((t) => t.status === 'done').length
  return Math.round((done / tasks.length) * 100)
}

// 프로젝트의 멤버·역할 목록 (닉네임 + 배정 역할 + 조장 여부)
async function membersWithRoles(projectId) {
  const { data: members, error: e1 } = await supabase
    .from('project_members')
    .select('id, nickname, joined_at, users(name)')
    .eq('project_id', projectId)
    .order('joined_at')
  throwIf(e1, '멤버 조회')

  const { data: assignments, error: e2 } = await supabase
    .from('assignments')
    .select('member_id, roles(name, is_leader_role)')
    .eq('project_id', projectId)
  throwIf(e2, '배정 조회')

  // 한 사람이 여러 역할(조장+실무 등)을 가질 수 있어 member별 배열로 묶는다
  const rolesByMember = new Map()
  assignments.forEach((a) => {
    if (!rolesByMember.has(a.member_id)) rolesByMember.set(a.member_id, [])
    rolesByMember.get(a.member_id).push(a.roles)
  })
  return members.map((m) => {
    const rs = rolesByMember.get(m.id) ?? []
    const workNames = rs.filter((r) => !r?.is_leader_role).map((r) => r.name)
    return {
      id: m.id,
      nickname: m.nickname,
      name: m.users?.name ?? '',
      roleName: workNames.length > 0 ? workNames.join(', ') : null, // 실무 역할(조장 표식 제외)
      isLeader: rs.some((r) => r?.is_leader_role),
    }
  })
}

export const me = Router()

// ── 대시보드 탭: 메인 프로젝트의 팀 전체 현황 ─────────────────
me.get('/api/me/dashboard', async (req, res) => {
  try {
    const user = await currentUser(req)

    const { data: membership, error: e1 } = await supabase
      .from('project_members')
      .select('id, project_id, projects(id, title, topic, deadline, status, creator_id)')
      .eq('user_id', user.id)
      .eq('is_main', true)
      .neq('projects.status', 'completed')
      .limit(1)
      .maybeSingle()
    throwIf(e1, '메인 프로젝트 조회')
    if (!membership?.projects) return res.json({ project: null })
    const project = membership.projects

    const { data: tasks, error: e2 } = await supabase
      .from('tasks')
      .select('id, milestone_id, status')
      .eq('project_id', project.id)
    throwIf(e2, '태스크 조회')

    const { data: milestones, error: e3 } = await supabase
      .from('milestones')
      .select('id, title, due_date, sort_order')
      .eq('project_id', project.id)
      .order('sort_order')
    throwIf(e3, '마일스톤 조회')

    // 전주 대비: 7일 전 이전의 가장 최근 스냅샷과 현재 완료율 비교
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { data: snapshot, error: e4 } = await supabase
      .from('progress_snapshots')
      .select('progress, snapshot_date')
      .eq('project_id', project.id)
      .lte('snapshot_date', weekAgo)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    throwIf(e4, '스냅샷 조회')

    const { data: activities, error: e5 } = await supabase
      .from('activity_log')
      .select('id, type, payload, created_at, project_members(nickname)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(8)
    throwIf(e5, '활동 조회')

    res.json({
      project: {
        id: project.id,
        title: project.title,
        topic: project.topic,
        deadline: project.deadline,
        isCreator: project.creator_id === user.id,
      },
      progress: progressOf(tasks),
      lastWeekProgress: snapshot ? Math.round(Number(snapshot.progress)) : null,
      milestones: milestones.map((ms) => {
        const msTasks = tasks.filter((t) => t.milestone_id === ms.id)
        return { id: ms.id, title: ms.title, dueDate: ms.due_date, progress: progressOf(msTasks), total: msTasks.length }
      }),
      members: await membersWithRoles(project.id),
      recentActivities: activities.map((a) => ({
        id: a.id,
        type: a.type,
        nickname: a.project_members?.nickname ?? '(탈퇴)',
        payload: a.payload,
        createdAt: a.created_at,
      })),
    })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 프로젝트 진행 탭: 메인 프로젝트에서 "내 작업" 현황 ─────────
me.get('/api/me/progress', async (req, res) => {
  try {
    const user = await currentUser(req)

    const { data: membership, error: e1 } = await supabase
      .from('project_members')
      .select('id, nickname, projects(id, title, deadline, status)')
      .eq('user_id', user.id)
      .eq('is_main', true)
      .neq('projects.status', 'completed')
      .limit(1)
      .maybeSingle()
    throwIf(e1, '메인 프로젝트 조회')
    if (!membership?.projects) return res.json({ project: null })
    const project = membership.projects

    const { data: myTasks, error: e2 } = await supabase
      .from('tasks')
      .select('id, title, status, due_date, sort_order, milestones(title)')
      .eq('project_id', project.id)
      .eq('assignee_member_id', membership.id)
      .order('due_date')
    throwIf(e2, '내 태스크 조회')

    const { data: myActivities, error: e3 } = await supabase
      .from('activity_log')
      .select('created_at')
      .eq('project_id', project.id)
      .eq('member_id', membership.id)
    throwIf(e3, '내 활동 조회')

    const { data: uploads, error: e4 } = await supabase
      .from('uploads')
      .select('id, task_id, kind, file_name, link_url, comment, created_at')
      .in('task_id', myTasks.map((t) => t.id))
      .order('created_at', { ascending: false })
    throwIf(e4, '업로드 조회')

    const { data: myRoles, error: e5 } = await supabase
      .from('assignments')
      .select('roles(name, is_leader_role)')
      .eq('member_id', membership.id)
    throwIf(e5, '내 역할 조회')
    const myWorkNames = myRoles.filter((a) => !a.roles?.is_leader_role).map((a) => a.roles?.name)

    res.json({
      project: { id: project.id, title: project.title, deadline: project.deadline },
      me: {
        nickname: membership.nickname,
        name: user.name,
        roleName: myWorkNames.length > 0 ? myWorkNames.join(', ') : null,
        isLeader: myRoles.some((a) => a.roles?.is_leader_role),
      },
      myProgress: progressOf(myTasks),
      taskCounts: {
        todo: myTasks.filter((t) => t.status === 'todo').length,
        doing: myTasks.filter((t) => t.status === 'doing').length,
        done: myTasks.filter((t) => t.status === 'done').length,
      },
      // 잔디: 내가 활동한 날짜(중복 제거) — 프론트가 캘린더에 초록으로 칠한다
      activityDates: [...new Set(myActivities.map((a) => a.created_at.slice(0, 10)))],
      tasks: myTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        dueDate: t.due_date,
        milestoneTitle: t.milestones?.title ?? null,
      })),
      // 프론트(ProgressTab)가 camelCase로 읽으므로 여기서 변환한다
      uploads: uploads.map((u) => ({
        id: u.id,
        taskId: u.task_id,
        kind: u.kind,
        fileName: u.file_name,
        linkUrl: u.link_url,
        comment: u.comment,
        createdAt: u.created_at,
      })),
    })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 프로젝트 관리 탭: 내가 참여한 모든 프로젝트 ────────────────
me.get('/api/me/projects', async (req, res) => {
  try {
    const user = await currentUser(req)

    const { data: memberships, error: e1 } = await supabase
      .from('project_members')
      .select('id, is_main, sort_order, projects(id, title, topic, deadline, status, creator_id)')
      .eq('user_id', user.id)
    throwIf(e1, '참여 프로젝트 조회')

    const result = await Promise.all(
      memberships
        .filter((m) => m.projects)
        .map(async (m) => {
          const p = m.projects
          const [{ data: tasks, error: e2 }, teamMembers] = await Promise.all([
            supabase.from('tasks').select('status').eq('project_id', p.id),
            membersWithRoles(p.id),
          ])
          throwIf(e2, '태스크 조회')
          return {
            id: p.id,
            title: p.title,
            topic: p.topic,
            deadline: p.deadline,
            status: p.status,
            isMain: m.is_main,
            sortOrder: m.sort_order,
            isCreator: p.creator_id === user.id,
            progress: progressOf(tasks),
            memberCount: teamMembers.length,
            memberNicknames: teamMembers.map((t) => t.nickname),
            leaderNickname: teamMembers.find((t) => t.isLeader)?.nickname ?? null,
          }
        }),
    )

    result.sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0) || a.sortOrder - b.sortOrder)
    res.json({
      active: result.filter((p) => p.status !== 'completed'),
      completed: result.filter((p) => p.status === 'completed'),
    })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 태스크 상태 변경: 자기 태스크만 (할 일 / 진행 중 / 완료) ──
const TASK_STATUS = new Set(['todo', 'doing', 'done'])
me.post('/api/me/tasks/:taskId/status', async (req, res) => {
  try {
    const user = await currentUser(req)
    const status = req.body?.status
    if (!TASK_STATUS.has(status)) throw fail(400, '태스크 상태 값이 올바르지 않습니다.')

    const { task, membership } = await loadOwnTask(user, req.params.taskId)

    const { error: e3 } = await supabase.from('tasks').update({ status }).eq('id', task.id)
    throwIf(e3, '태스크 상태 변경')

    // 실제로 바뀌었으면 활동 로그(대시보드 최근 활동) 기록
    if (task.status !== status) {
      await supabase.from('activity_log').insert({
        project_id: task.project_id,
        member_id: membership.id,
        type: 'task_status',
        payload: { task: task.title, to: status },
      })
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 태스크 자료 업로드: 링크 + 코멘트 (자기 태스크만) ──
// (파일 업로드는 후속 슬라이스 — Storage 버킷·서명 URL 필요)
me.post('/api/me/tasks/:taskId/uploads', async (req, res) => {
  try {
    const user = await currentUser(req)
    const { task, membership } = await loadOwnTask(user, req.params.taskId)

    const url = normalizeUrl(req.body?.url)
    const comment = String(req.body?.comment ?? '').trim()
    if (comment.length > 100) throw fail(400, '코멘트는 100자까지 입력할 수 있습니다.')

    const { error: e1 } = await supabase.from('uploads').insert({
      project_id: task.project_id,
      task_id: task.id,
      member_id: membership.id,
      kind: 'link',
      link_url: url,
      comment: comment || null,
    })
    throwIf(e1, '자료 업로드')

    // 활동 로그 — 대시보드 최근 활동 + 참여 잔디(activityDates)의 원천
    await supabase.from('activity_log').insert({
      project_id: task.project_id,
      member_id: membership.id,
      type: 'upload',
      payload: { task: task.title },
    })

    res.status(201).json({ ok: true })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 태스크 자료 삭제: 올린 본인만 ──
me.delete('/api/me/uploads/:uploadId', async (req, res) => {
  try {
    const user = await currentUser(req)

    const { data: upload, error: e1 } = await supabase
      .from('uploads')
      .select('id, project_id, member_id')
      .eq('id', req.params.uploadId)
      .maybeSingle()
    throwIf(e1, '자료 조회')
    if (!upload) throw fail(404, '자료를 찾을 수 없습니다.')

    const { data: membership, error: e2 } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', upload.project_id)
      .eq('user_id', user.id)
      .maybeSingle()
    throwIf(e2, '멤버 확인')
    if (!membership || upload.member_id !== membership.id) {
      throw fail(403, '내가 올린 자료만 삭제할 수 있습니다.')
    }

    const { error: e3 } = await supabase.from('uploads').delete().eq('id', upload.id)
    throwIf(e3, '자료 삭제')

    res.json({ ok: true })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 프로젝트 관리 탭: 내 프로젝트 순서 변경 (개인별 sort_order 일괄 갱신) ──
me.post('/api/me/projects/reorder', async (req, res) => {
  try {
    const user = await currentUser(req)
    const ids = Array.isArray(req.body?.projectIds) ? req.body.projectIds : []
    if (ids.length === 0) throw fail(400, '순서를 지정할 프로젝트가 없습니다.')

    // 전부 내 멤버십인지 확인 (남의 프로젝트 순서는 못 바꿈)
    const { data: mine, error: e1 } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)
    throwIf(e1, '내 멤버십 조회')
    const mineSet = new Set(mine.map((m) => m.project_id))
    if (!ids.every((id) => mineSet.has(id))) throw fail(400, '내 프로젝트만 순서를 바꿀 수 있습니다.')

    // 보낸 순서대로 sort_order = index (내 멤버십 행만 한정)
    const updates = ids.map((id, i) =>
      supabase.from('project_members').update({ sort_order: i }).eq('user_id', user.id).eq('project_id', id),
    )
    for (const { error } of await Promise.all(updates)) throwIf(error, '순서 저장')

    res.json({ ok: true })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})
