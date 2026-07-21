// ─────────────────────────────────────────────────────────────
//  갭 분석 출력 스키마 (JSON Schema) — LLM 출력의 '구조 계약'.
//  용도 2가지:
//   (1) LLM한테 "정확히 이 모양으로 뱉어라"고 강제 (구조화 출력)
//   (2) 나온 출력의 '구조(모양·타입·enum)'를 검증하는 기준
//  ※ 의미(정직성) 검증은 validate.js가 따로 한다. 여기는 '모양'만 정의.
// ─────────────────────────────────────────────────────────────

// 요구역량 하나(req)의 스키마
export const REQ_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    status: { type: 'string', enum: ['strong', 'ok', 'weak', 'gap'] },
    why: { type: 'string' },
    tags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          type: { type: 'string', enum: ['repo', 'wiki', 'self', 'gap'] },
        },
        required: ['label', 'type'],
      },
    },
    action: { type: 'string' },
    aiBar: {
      type: 'object',
      properties: {
        self: { type: 'integer' },
        assist: { type: 'integer' },
        note: { type: 'string' },
      },
      required: ['self', 'assist', 'note'],
    },
  },
  required: ['name', 'status', 'why', 'action'],
}

// 공고 하나에 대한 갭 분석 전체(job)의 스키마
export const JOB_SCHEMA = {
  type: 'object',
  properties: {
    company: { type: 'string' },
    role: { type: 'string' },
    tier: { type: 'string', enum: ['green', 'yellow', 'red'] },
    fit: { type: 'integer' },
    concept: { type: 'integer' },
    impl: { type: 'integer' },
    gapNote: { type: 'string' },
    skillRows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          concept: { type: 'integer' },
          impl: { type: 'integer' },
        },
        required: ['name', 'concept', 'impl'],
      },
    },
    reqRequired: { type: 'array', items: REQ_SCHEMA },
    reqPreferred: { type: 'array', items: REQ_SCHEMA },
    gapActions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          order: { type: 'integer' },
          locked: { type: 'boolean' },
          title: { type: 'string' },
          desc: { type: 'string' },
        },
        required: ['order', 'title', 'desc'],
      },
    },
    provenance: { type: 'string' },
  },
  required: ['company', 'role', 'tier', 'fit', 'concept', 'impl', 'reqRequired', 'gapActions'],
}
