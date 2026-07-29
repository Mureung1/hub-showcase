import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { PROJECT_TYPES, ROLES_BY_TYPE, PLAN_TEMPLATES } from '../../src/data/templates.js'
import { parseDate, toDateInputValue, addDays, diffDays } from '../../src/utils/dates.js'

/* 플래너 에이전트 — 과제 정보로 역할·마일스톤·태스크 계획을 만든다.
   Claude API를 우선 쓰되, 키가 없거나 호출/검증에 실패하면 유형별 템플릿으로 폴백한다.
   → 키 유무와 무관하게 항상 유효한 계획을 반환한다.

   반환 형태(화면 PlanReview·저장 projects.js가 그대로 사용):
     roles:      [{ id(slug), name, emoji, description, min, max, isLeader }]  (조장 1개 포함)
     milestones: [{ id(slug), title, dueDate 'YYYY-MM-DD', tasks: [{ id(slug), title, roleId }] }] */

const DEFAULT_TYPE = 'presentation'
// claude-api 스킬 기본값. 학생 프로젝트라 비용이 부담이면 .env에 ANTHROPIC_MODEL로 교체 가능
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5'

/* 구조화 출력 스키마 — Claude가 이 모양의 JSON만 내도록 강제한다.
   (구조화 출력 제약: 모든 object에 additionalProperties:false + required, 수치·문자열 길이 constraint 미사용) */
const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['roles', 'milestones'],
  properties: {
    roles: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'emoji', 'description', 'min', 'max', 'isLeader'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          emoji: { type: 'string' },
          description: { type: 'string' },
          min: { type: 'integer' },
          max: { type: 'integer' },
          isLeader: { type: 'boolean' },
        },
      },
    },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'dueDate', 'tasks'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          dueDate: { type: 'string', format: 'date' },
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'title', 'roleId'],
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                roleId: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
}

const SYSTEM_PROMPT = `당신은 대학생 팀 프로젝트의 '킥오프'를 돕는 중립적 계획 설계자입니다.
주어진 과제 정보로 역할 정의 + 마일스톤 + 태스크를 설계해 JSON으로만 응답하세요.

규칙:
- 모든 텍스트(역할명·설명·마일스톤·태스크)는 한국어로 작성합니다.
- roles: 4~6개. 반드시 조장 역할을 정확히 1개 포함하고 그 역할만 isLeader를 true로 둡니다(조장 name은 "조장"). 나머지는 실무 역할입니다.
- 각 역할의 id는 영문 소문자 slug(예: research, slides), min은 1 이상, max는 min 이상으로 정합니다.
- emoji는 역할을 나타내는 이모지 1개.
- milestones: 3~5개, 마감이 빠른 순서(오름차순). 각 마일스톤 dueDate는 오늘 다음날부터 마감일 사이의 날짜(YYYY-MM-DD)로, 기피 날짜는 피합니다. 마지막 마일스톤은 마감일에 둡니다.
- 각 마일스톤 tasks: 2~4개. 각 task의 roleId는 위 roles의 id 중 하나여야 합니다.
- 과제 유형과 주제에 맞는 현실적인 역할·일정을 제안합니다.`

function typeLabelOf(typeId) {
  return PROJECT_TYPES.find((t) => t.id === typeId)?.label ?? '지정 안 함'
}

/* Claude 호출 — 실패 시 throw (상위에서 폴백) */
async function aiPlan({ title, topic, typeHint, deadline, headcount, avoidDates }) {
  const client = new Anthropic() // ANTHROPIC_API_KEY를 환경에서 읽음
  const today = toDateInputValue(new Date())
  const userMsg =
    `프로젝트 제목: ${title}\n` +
    `주제: ${topic}\n` +
    `과제 유형: ${typeLabelOf(typeHint)}\n` +
    `오늘 날짜: ${today}\n` +
    `마감일: ${deadline}\n` +
    `팀원 수: ${headcount}명\n` +
    `기피 날짜: ${avoidDates.length > 0 ? avoidDates.join(', ') : '없음'}`

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: PLAN_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  })

  if (res.stop_reason === 'refusal') throw new Error('안전 분류기가 요청을 거부했습니다.')
  const block = res.content.find((b) => b.type === 'text')
  if (!block?.text) throw new Error('응답에 계획 JSON이 없습니다.')
  return JSON.parse(block.text)
}

/* 서버 검증 + dueDate 클램프 — 위반이면 throw (상위에서 재시도/폴백) */
function validateAndClamp(plan, { deadline }) {
  if (!plan || !Array.isArray(plan.roles) || !Array.isArray(plan.milestones)) {
    throw new Error('계획 구조가 올바르지 않습니다.')
  }
  if (plan.roles.filter((r) => r.isLeader).length !== 1) throw new Error('조장 역할은 정확히 1개여야 합니다.')

  const roleIds = new Set(plan.roles.map((r) => r.id))
  if (roleIds.size !== plan.roles.length) throw new Error('역할 id가 중복됩니다.')
  for (const r of plan.roles) {
    if (typeof r.min !== 'number' || typeof r.max !== 'number' || r.min < 0 || r.max < r.min) {
      throw new Error(`역할 인원 범위가 올바르지 않습니다: ${r.id}`)
    }
  }

  if (plan.milestones.length === 0) throw new Error('마일스톤이 비어 있습니다.')
  const todayMidnight = parseDate(toDateInputValue(new Date()))
  const deadlineDate = parseDate(deadline)
  for (const m of plan.milestones) {
    if (!Array.isArray(m.tasks) || m.tasks.length === 0) throw new Error(`마일스톤에 태스크가 없습니다: ${m.id}`)
    let d = parseDate(m.dueDate)
    if (Number.isNaN(d.getTime())) throw new Error(`마일스톤 날짜가 올바르지 않습니다: ${m.id}`)
    if (d <= todayMidnight) d = addDays(todayMidnight, 1) // 과거·오늘 → 내일로
    if (d > deadlineDate) d = deadlineDate // 마감 이후 → 마감일로
    m.dueDate = toDateInputValue(d)
    for (const t of m.tasks) {
      if (!roleIds.has(t.roleId)) throw new Error(`태스크의 roleId가 역할에 없습니다: ${t.roleId}`)
    }
  }
  return plan
}

/* 폴백 — 유형별 템플릿(변형 0)을 서버에서 계획으로 환산. flowMock.buildPlan과 동일 결과 */
function fallbackPlan({ typeHint, deadline }) {
  const type = PLAN_TEMPLATES[typeHint] ? typeHint : DEFAULT_TYPE
  const roles = ROLES_BY_TYPE[type].map((r) => ({
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    description: r.description,
    min: r.min,
    max: r.max,
    isLeader: Boolean(r.isLeader),
  }))

  const template = PLAN_TEMPLATES[type].variants[0]
  const today = new Date()
  const totalDays = Math.max(diffDays(today, parseDate(deadline)), 1)
  const milestones = template.map((m, i) => ({
    id: `m${i}`,
    title: m.title,
    // pos(0~1 상대 위치) → 실제 날짜
    dueDate: toDateInputValue(addDays(today, Math.max(Math.round(totalDays * m.pos), 1))),
    tasks: m.tasks.map((t, j) => ({ id: `m${i}t${j}`, title: t.title, roleId: t.roleId })),
  }))

  return { roles, milestones }
}

/**
 * 과제 정보 → 계획(roles + milestones). 항상 유효한 계획을 반환한다.
 * @param {{title,topic,typeHint,deadline,headcount,avoidDates:string[]}} input
 */
export async function generatePlan(input) {
  if (process.env.ANTHROPIC_API_KEY) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return validateAndClamp(await aiPlan(input), input)
      } catch (err) {
        console.warn(`[planner] AI 계획 생성 실패(시도 ${attempt}/2): ${err.message}`)
      }
    }
    console.warn('[planner] 템플릿 폴백으로 전환합니다.')
  }
  return fallbackPlan(input)
}
