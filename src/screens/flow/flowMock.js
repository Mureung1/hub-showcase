/* 플로우 화면(계획 검토→초대→join→설문→배정) 공용 목업 데이터.
   4단계에서 이 파일의 함수들은 서버 API 호출로 교체된다 —
   화면 컴포넌트는 여기서 받은 모양 그대로 쓰므로 교체 시 화면 수정이 없도록 설계했다. */

import { PLAN_TEMPLATES, getRolesForType, getTypeById } from '../../data/templates'
import { addDays, toDateInputValue, parseDate, diffDays } from '../../utils/dates'

/* 목업 단계이므로 프로젝트 id는 고정값. 4단계에서 실제 uuid로 교체된다. */
export const DEMO_PROJECT_ID = 'demo'

/* "다시 제안받기" 최대 횟수 — DB projects.regen_count check (0~3)와 동일 */
export const MAX_REGENERATE = 3

const DEFAULT_TYPE = 'presentation'

/* 위저드를 거치지 않고 URL로 직접 들어왔을 때(새로고침·주소창 입력·스크린샷 검증)
   화면이 비지 않도록 쓰는 기본값. 실제 플로우에서는 위저드 입력이 이 자리를 덮는다. */
export function fallbackProject() {
  return {
    title: '경영학원론 팀 프로젝트',
    topic: 'ESG 경영 사례를 분석하고 개선안을 제안하는 팀 발표 과제',
    typeHint: DEFAULT_TYPE,
    deadline: toDateInputValue(addDays(new Date(), 30)),
    headcount: 4,
    avoidCount: 0,
  }
}

/* 위저드 → 계획 검토로 넘길 값만 추린다 (File 객체 등 직렬화 불가한 값 제외) */
export function toFlowProject(form) {
  return {
    title: form.title,
    topic: form.topic,
    typeHint: form.typeHint ?? DEFAULT_TYPE,
    deadline: form.deadline,
    headcount: form.headcount,
    avoidCount: form.avoidDates.length,
  }
}

/**
 * 과제 유형·마감일로 계획안(역할+마일스톤+태스크)을 만든다.
 * 템플릿의 pos(0~1 상대 위치)를 실제 마감 날짜로 환산하는 것이 핵심.
 * 4단계에서는 이 자리가 Claude 플래너 응답이 되고, 템플릿은 실패 시 폴백으로 남는다.
 *
 * @param {string|null} typeId - 과제 유형 (없으면 발표 과제 기준)
 * @param {number} variantIndex - 0=기본안, 1·2=다시 제안받기 결과
 * @param {string} deadline - 'YYYY-MM-DD'
 */
export function buildPlan(typeId, variantIndex, deadline) {
  const type = PLAN_TEMPLATES[typeId] ? typeId : DEFAULT_TYPE
  const variants = PLAN_TEMPLATES[type].variants
  const template = variants[variantIndex % variants.length]

  const today = new Date()
  const totalDays = Math.max(diffDays(today, parseDate(deadline)), 1)

  return {
    // templates.js는 min/max, DB roles 테이블은 min_count/max_count — 4단계 저장 시 매핑 필요
    roles: getRolesForType(type).map((r) => ({ ...r })),
    milestones: template.map((m, i) => ({
      id: `m${i}`,
      title: m.title,
      // pos(상대 위치) → due_date(실제 날짜). DB에는 pos 개념이 없다
      dueDate: toDateInputValue(addDays(today, Math.max(Math.round(totalDays * m.pos), 1))),
      tasks: m.tasks.map((t, j) => ({ id: `m${i}t${j}`, title: t.title, roleId: t.roleId })),
    })),
  }
}

export function typeLabelOf(typeId) {
  return getTypeById(typeId)?.label ?? '선택 안 함'
}

/* 초대 토큰 — 4단계에서 서버가 발급한다 (여기서는 화면 확인용 난수) */
export function makeInviteToken() {
  return Math.random().toString(36).slice(2, 10)
}

/* 목업 팀원 닉네임 — 4단계에서 project_members 조회로 교체 */
const NICKNAMES = ['민지', '준호', '서연', '지훈', '하늘', '도윤', '수아', '예린']

/** 0번이 생성자, 1번이 "나"(초대 링크로 합류한 사람) */
export function makeMembers(headcount) {
  return Array.from({ length: headcount }, (_, i) => ({
    id: `mem${i}`,
    name: NICKNAMES[i] ?? `팀원${i + 1}`,
    isCreator: i === 0,
  }))
}

/**
 * 다른 팀원들의 설문 응답을 만든다.
 * 인덱스만큼 역할 순서를 회전시켜 선호가 적당히 겹치면서도 충돌이 과하지 않게 —
 * 난수를 쓰지 않으므로 새로고침해도 같은 배정 결과가 나온다(시연 재현성).
 */
export function makeMockSurveys(members, roles) {
  const surveys = {}
  members.forEach((m, i) => {
    const rotated = roles.map((_, j) => roles[(j + i) % roles.length])
    surveys[m.id] = {
      preferences: rotated.slice(0, 3).map((r) => r.id),
      avoid: rotated[rotated.length - 1].id,
      experience: [rotated[0].id],
      leader: m.isCreator ? 'yes' : 'any',
    }
  })
  return surveys
}

/* 설문 미응답자는 중립 처리 — assignRoles가 기대하는 형태 */
export const NEUTRAL_SURVEY = { preferences: [], avoid: null, experience: [], leader: 'any' }
