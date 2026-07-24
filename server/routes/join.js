// 초대 합류 라우트 — 팀원이 초대 링크(/join/:token)로 들어와 가입하고 팀에 합류한다.
// 로그인 없이 접근하며, 성공 시 계정을 만들고 자동 로그인(쿠키)까지 처리한다.
import { Router } from 'express'
import { supabase } from '../db/supabase.js'
import { createUser } from './auth.js'
import { signToken, setAuthCookie } from '../lib/auth.js'

function throwIf(error, where) {
  if (error) throw new Error(`${where}: ${error.message}`)
}

function fail(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

// 초대 토큰으로 프로젝트를 찾는다 (모집 중인 것만). 없거나 모집 상태가 아니면 404.
async function projectByToken(token) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, topic, type_hint, headcount, status, creator_id')
    .eq('invite_token', token)
    .maybeSingle()
  throwIf(error, '초대 조회')
  if (!data || data.status !== 'recruiting') throw fail(404, '유효하지 않은 초대 링크입니다.')
  return data
}

export const join = Router()

// ── 초대 미리보기: 프로젝트 정보 + 참여 현황 (로그인 불필요) ──
join.get('/api/join/:token', async (req, res) => {
  try {
    const project = await projectByToken(req.params.token)

    const { data: members, error } = await supabase
      .from('project_members')
      .select('nickname, user_id, joined_at')
      .eq('project_id', project.id)
      .order('joined_at')
    throwIf(error, '팀원 조회')

    res.json({
      projectId: project.id,
      title: project.title,
      topic: project.topic,
      typeHint: project.type_hint,
      headcount: project.headcount,
      joinedCount: members.length,
      isFull: members.length >= project.headcount,
      members: members.map((m) => ({ nickname: m.nickname, isCreator: m.user_id === project.creator_id })),
    })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ── 합류: 가입 + 닉네임 → 계정 생성 + 팀원 등록 + 자동 로그인 (로그인 불필요) ──
join.post('/api/join/:token', async (req, res) => {
  try {
    const project = await projectByToken(req.params.token)

    const { data: existing, error: em } = await supabase
      .from('project_members')
      .select('nickname')
      .eq('project_id', project.id)
    throwIf(em, '팀원 조회')

    // 정원 검사
    if (existing.length >= project.headcount) {
      throw fail(409, '정원이 가득 찼습니다. 팀 생성자에게 문의해 주세요.')
    }

    // 닉네임 검사 — 계정 생성 "전에" 먼저 확인해 실패 시 계정이 남지 않게 한다
    const nickname = String(req.body?.nickname ?? '').trim()
    if (!nickname) throw fail(400, '닉네임을 입력해 주세요.')
    if (existing.some((m) => m.nickname === nickname)) throw fail(409, '이미 사용 중인 닉네임입니다.')

    // 계정 생성 (아이디/비번 검증·중복 아이디는 createUser가 throw)
    const user = await createUser(req.body)

    // 팀원 등록 — 새 계정이라 첫 프로젝트 → 메인으로 지정
    const { data: member, error: e1 } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user.id,
        nickname,
        is_main: true,
        sort_order: existing.length,
      })
      .select('id')
      .single()
    if (e1) {
      // (project_id, nickname) unique 위반 — 근소한 동시 가입 레이스 방어선
      if (e1.code === '23505') throw fail(409, '이미 사용 중인 닉네임입니다.')
      throwIf(e1, '팀원 등록')
    }

    // 활동 로그(대시보드 "최근 활동"에 합류 표시) — 실패해도 합류는 성공 처리(best-effort)
    await supabase.from('activity_log').insert({ project_id: project.id, member_id: member.id, type: 'join' })

    // 자동 로그인
    setAuthCookie(res, signToken(user.id))
    res.status(201).json({ projectId: project.id })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})
