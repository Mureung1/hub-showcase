// ============================================================
// 목업 데이터 시드 — 실행: node server/db/seed.js
// 시드 계정 3명 + 프로젝트 2개(진행 중 1, 완료 1)를 Supabase에 넣는다.
// 재실행하면 기존 시드 데이터를 지우고 새로 만든다. (시드 계정만 삭제 — cascade로 하위 정리)
// 시드 계정 비밀번호는 전부: teamplease1
// ============================================================
import bcrypt from 'bcryptjs'
import { supabase } from './supabase.js'

const SEED_USERNAMES = ['minji', 'junho', 'seoyeon']
const SEED_PASSWORD = 'teamplease1'

// 오늘 기준 offset일의 'YYYY-MM-DD'
function dateStr(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

// 오늘 기준 offset일의 timestamptz (활동 시각을 낮 시간대로 분산)
function ts(offsetDays, hour = 14) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0)
  return d.toISOString()
}

async function insert(table, rows) {
  const { data, error } = await supabase.from(table).insert(rows).select()
  if (error) throw new Error(`${table} insert 실패: ${error.message}`)
  return data
}

async function main() {
  // 0. 기존 시드 데이터 정리 — 시드 계정을 지우면 cascade로 프로젝트·하위 전부 삭제됨
  const { error: delError } = await supabase.from('users').delete().in('username', SEED_USERNAMES)
  if (delError) throw new Error(`기존 시드 삭제 실패: ${delError.message}`)

  // 1. 사용자 3명
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)
  const [minji, junho, seoyeon] = await insert('users', [
    { username: 'minji', password_hash: passwordHash, name: '김민지', email: 'minji@example.com' },
    { username: 'junho', password_hash: passwordHash, name: '이준호' },
    { username: 'seoyeon', password_hash: passwordHash, name: '박서연' },
  ])

  // 2. 프로젝트 1 — 진행 중 (대시보드·진행 탭의 주인공)
  const [project] = await insert('projects', [
    {
      creator_id: minji.id,
      title: '경영학원론 팀 프로젝트',
      topic: '국내 스타트업 성공 사례 분석 — 시장 진입 전략과 조직 문화를 중심으로 사례 3개를 비교 분석한다.',
      type_hint: '발표형',
      deadline: dateStr(15),
      headcount: 3,
      status: 'active',
      invite_token: 'seed-active-project-token',
      regen_count: 1,
      revealed_at: ts(-6, 10),
      assignment_summary:
        '설문 결과 리더 경험과 의향이 가장 높은 김민지 님이 조장을 맡고, 자료 탐색 선호가 뚜렷한 이준호 님이 자료 조사를, 발표 경험이 많은 박서연 님이 발표·자료 제작을 맡는 구성이 팀 만족도가 가장 높았습니다.',
    },
  ])

  const [mMinji, mJunho, mSeoyeon] = await insert('project_members', [
    { project_id: project.id, user_id: minji.id, nickname: '민지', is_main: true, sort_order: 0, joined_at: ts(-7, 9) },
    { project_id: project.id, user_id: junho.id, nickname: '준호', is_main: true, sort_order: 0, joined_at: ts(-7, 11) },
    { project_id: project.id, user_id: seoyeon.id, nickname: '서연', is_main: true, sort_order: 0, joined_at: ts(-6, 9) },
  ])

  await insert('avoid_dates', [
    { project_id: project.id, date: dateStr(4) },
    { project_id: project.id, date: dateStr(5) },
  ])

  const [roleLeader, roleResearch, rolePresent] = await insert('roles', [
    { project_id: project.id, name: '조장', description: '일정 관리와 의사결정 조율, 최종 취합을 담당', min_count: 1, max_count: 1, is_leader_role: true, sort_order: 0 },
    { project_id: project.id, name: '자료 조사', description: '사례 기업 자료 수집과 출처 정리를 담당', min_count: 1, max_count: 2, is_leader_role: false, sort_order: 1 },
    { project_id: project.id, name: '발표·자료 제작', description: '발표 슬라이드 제작과 최종 발표를 담당', min_count: 1, max_count: 2, is_leader_role: false, sort_order: 2 },
  ])

  await insert('assignments', [
    { project_id: project.id, member_id: mMinji.id, role_id: roleLeader.id },
    { project_id: project.id, member_id: mJunho.id, role_id: roleResearch.id },
    { project_id: project.id, member_id: mSeoyeon.id, role_id: rolePresent.id },
  ])

  // 3. 마일스톤 3개 + 태스크 9개 (완료 → 진행 중 → 예정 순으로 자연스럽게)
  const [ms1, ms2, ms3] = await insert('milestones', [
    { project_id: project.id, title: '주제 확정과 사례 선정', description: '분석 대상 스타트업 3곳 확정', due_date: dateStr(-2), sort_order: 0 },
    { project_id: project.id, title: '사례 분석과 보고서 초안', description: '기업별 분석과 비교 프레임 작성', due_date: dateStr(7), sort_order: 1 },
    { project_id: project.id, title: '발표 준비와 최종 제출', description: '슬라이드 완성, 리허설, 최종 제출', due_date: dateStr(14), sort_order: 2 },
  ])

  const tasks = await insert('tasks', [
    // 마일스톤 1 — 전부 완료
    { project_id: project.id, milestone_id: ms1.id, role_id: roleLeader.id, assignee_member_id: mMinji.id, title: '분석 프레임 확정', status: 'done', due_date: dateStr(-4), sort_order: 0 },
    { project_id: project.id, milestone_id: ms1.id, role_id: roleResearch.id, assignee_member_id: mJunho.id, title: '후보 스타트업 10곳 리스트업', status: 'done', due_date: dateStr(-3), sort_order: 1 },
    { project_id: project.id, milestone_id: ms1.id, role_id: rolePresent.id, assignee_member_id: mSeoyeon.id, title: '사례 3곳 최종 선정 정리', status: 'done', due_date: dateStr(-2), sort_order: 2 },
    // 마일스톤 2 — 진행 중
    { project_id: project.id, milestone_id: ms2.id, role_id: roleResearch.id, assignee_member_id: mJunho.id, title: '기업별 시장 진입 전략 조사', status: 'done', due_date: dateStr(1), sort_order: 0 },
    { project_id: project.id, milestone_id: ms2.id, role_id: roleLeader.id, assignee_member_id: mMinji.id, title: '비교 분석표 작성', status: 'doing', due_date: dateStr(3), sort_order: 1 },
    { project_id: project.id, milestone_id: ms2.id, role_id: rolePresent.id, assignee_member_id: mSeoyeon.id, title: '보고서 초안 목차 구성', status: 'doing', due_date: dateStr(6), sort_order: 2 },
    // 마일스톤 3 — 예정
    { project_id: project.id, milestone_id: ms3.id, role_id: rolePresent.id, assignee_member_id: mSeoyeon.id, title: '발표 슬라이드 제작', status: 'todo', due_date: dateStr(10), sort_order: 0 },
    { project_id: project.id, milestone_id: ms3.id, role_id: roleLeader.id, assignee_member_id: mMinji.id, title: '리허설 일정 조율', status: 'todo', due_date: dateStr(12), sort_order: 1 },
    { project_id: project.id, milestone_id: ms3.id, role_id: roleResearch.id, assignee_member_id: mJunho.id, title: '참고 문헌 목록 정리', status: 'todo', due_date: dateStr(13), sort_order: 2 },
  ])

  // 4. 업로드 2건 (링크형 — 시드에선 Storage 실파일 없이 링크만)
  await insert('uploads', [
    { project_id: project.id, task_id: tasks[1].id, member_id: mJunho.id, kind: 'link', link_url: 'https://docs.google.com/spreadsheets/d/seed-startup-list', comment: '후보 10곳 정리 시트입니다. 3번 시트가 최종 후보예요.', created_at: ts(-3, 16) },
    { project_id: project.id, task_id: tasks[3].id, member_id: mJunho.id, kind: 'link', link_url: 'https://docs.google.com/document/d/seed-strategy-notes', comment: '전략 조사 노트 공유합니다.', created_at: ts(-1, 20) },
  ])

  // 5. 활동 로그 — 최근 활동 피드 + 잔디 캘린더의 원천 (여러 날짜에 분산)
  await insert('activity_log', [
    { project_id: project.id, member_id: mMinji.id, type: 'join', payload: { nickname: '민지' }, created_at: ts(-7, 9) },
    { project_id: project.id, member_id: mJunho.id, type: 'join', payload: { nickname: '준호' }, created_at: ts(-7, 11) },
    { project_id: project.id, member_id: mSeoyeon.id, type: 'join', payload: { nickname: '서연' }, created_at: ts(-6, 9) },
    { project_id: project.id, member_id: mMinji.id, type: 'reveal', payload: {}, created_at: ts(-6, 10) },
    { project_id: project.id, member_id: mMinji.id, type: 'task_status', payload: { task: '분석 프레임 확정', to: 'done' }, created_at: ts(-4, 15) },
    { project_id: project.id, member_id: mJunho.id, type: 'upload', payload: { task: '후보 스타트업 10곳 리스트업' }, created_at: ts(-3, 16) },
    { project_id: project.id, member_id: mJunho.id, type: 'task_status', payload: { task: '후보 스타트업 10곳 리스트업', to: 'done' }, created_at: ts(-3, 17) },
    { project_id: project.id, member_id: mSeoyeon.id, type: 'task_status', payload: { task: '사례 3곳 최종 선정 정리', to: 'done' }, created_at: ts(-2, 13) },
    { project_id: project.id, member_id: mJunho.id, type: 'upload', payload: { task: '기업별 시장 진입 전략 조사' }, created_at: ts(-1, 20) },
    { project_id: project.id, member_id: mJunho.id, type: 'task_status', payload: { task: '기업별 시장 진입 전략 조사', to: 'done' }, created_at: ts(-1, 21) },
    { project_id: project.id, member_id: mMinji.id, type: 'task_status', payload: { task: '비교 분석표 작성', to: 'doing' }, created_at: ts(0, 10) },
  ])

  // 6. 진행률 스냅샷 — "전주 대비 증감" 계산용 과거 기록
  await insert('progress_snapshots', [
    { project_id: project.id, snapshot_date: dateStr(-14), progress: 0, payload: {} },
    { project_id: project.id, snapshot_date: dateStr(-7), progress: 22.22, payload: {} },
  ])

  // 7. 프로젝트 2 — 완료된 프로젝트 (관리 탭의 "완료된 프로젝트" 섹션용)
  const [doneProject] = await insert('projects', [
    {
      creator_id: seoyeon.id,
      title: '데이터베이스 기말 프로젝트',
      topic: '도서관 좌석 예약 시스템의 ERD 설계와 SQL 구현',
      type_hint: '개발형',
      deadline: dateStr(-20),
      headcount: 3,
      status: 'completed',
      invite_token: 'seed-done-project-token',
      created_at: ts(-45, 10),
    },
  ])
  const [dmSeoyeon, dmMinji] = await insert('project_members', [
    { project_id: doneProject.id, user_id: seoyeon.id, nickname: '서연', sort_order: 1, joined_at: ts(-45, 10) },
    { project_id: doneProject.id, user_id: minji.id, nickname: '민지', sort_order: 1, joined_at: ts(-44, 12) },
  ])
  const [dRoleLeader, dRoleDev] = await insert('roles', [
    { project_id: doneProject.id, name: '조장', min_count: 1, max_count: 1, is_leader_role: true, sort_order: 0 },
    { project_id: doneProject.id, name: '구현', min_count: 1, max_count: 2, is_leader_role: false, sort_order: 1 },
  ])
  await insert('assignments', [
    { project_id: doneProject.id, member_id: dmSeoyeon.id, role_id: dRoleLeader.id },
    { project_id: doneProject.id, member_id: dmMinji.id, role_id: dRoleDev.id },
  ])
  const [dMs] = await insert('milestones', [
    { project_id: doneProject.id, title: 'ERD 설계와 구현', due_date: dateStr(-21), sort_order: 0 },
  ])
  await insert('tasks', [
    { project_id: doneProject.id, milestone_id: dMs.id, role_id: dRoleLeader.id, assignee_member_id: dmSeoyeon.id, title: 'ERD 설계', status: 'done', due_date: dateStr(-30), sort_order: 0 },
    { project_id: doneProject.id, milestone_id: dMs.id, role_id: dRoleDev.id, assignee_member_id: dmMinji.id, title: 'SQL 구현과 테스트', status: 'done', due_date: dateStr(-22), sort_order: 1 },
  ])

  console.log('시드 완료!')
  console.log(`- 사용자 3명 (아이디: ${SEED_USERNAMES.join(', ')} / 비밀번호: ${SEED_PASSWORD})`)
  console.log(`- 진행 중 프로젝트: "${project.title}" (태스크 9, 마일스톤 3)`)
  console.log(`- 완료 프로젝트: "${doneProject.title}"`)
}

main().catch((e) => {
  console.error('시드 실패:', e.message)
  process.exit(1)
})
