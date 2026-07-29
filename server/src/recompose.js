// 체크 상태를 반영한 로드맵 재조합 (Express 조합기).
//
// 정의는 docs/architecture.md 4장·9.1 이다. 준비 현황·로드맵 조합기는 Express 소관이므로
// 체크 변경만으로는 FastAPI 를 부르지 않는다. 시연 경로에서 에이전트 서비스가 꺼져 있어도
// 체크리스트를 켜고 끄는 상호작용이 그대로 동작한다.
//
// 기준 구현은 파이썬 `agent/src/careersignal/agents/roadmap/recompose.py` 다. 두 구현이
// 갈라지면 같은 체크에 다른 순서가 나오므로, `__fixtures__/recompose-cases.json` 이
// 파이썬 결과를 그대로 담고 `recompose.test.js` 가 전량을 대조한다.
//
// 순수 함수다. 저장된 payload 와 체크 맵을 받아 새 payload 를 돌려준다. 저장소도 모델도
// 부르지 않고 입력을 고치지도 않는다.
//
// 화면의 네 결과 가운데 로드맵만 체크 변경에 재조합으로 반응한다. 체크리스트는 내용을
// 유지한 채 보유 상태만 바뀌고, 포트폴리오·자소서·면접 전략은 변하지 않는다.
//
// 체크 맵의 키는 `checklist_concepts.concept_id` 다. payload 의 `fills[].item_id` 와
// `check_rows[].item_id` 가 같은 값을 담으므로 세 곳이 하나의 키로 이어진다.
//
// 재조합은 버리지 않는다. 이미 채운 단계도 뒤로 밀 뿐 목록에 남긴다. 사라지면 사용자가
// 체크를 되돌렸을 때 무엇이 있었는지 알 수 없고, 저장된 로드맵과 화면의 단계 수가 달라진다.

// 이미 채운 개념의 `check_rows[].source_step`.
const HELD_LABEL = '보유'

// 이미 채운 단계의 우선순위를 한 칸 내린다.
//
// 0 으로 만들지 않는다. 체크는 사용자의 자기 보고이고 되돌릴 수 있으므로, 순위를 지우면
// 되돌렸을 때 원래 값을 복원할 근거가 payload 에 없다. 한 칸만 내려 뒤로 밀렸다는 사실을
// 표시한다. `track` 은 순위가 아니라 갈래이므로 내리지 않는다.
const LOWER_PRIORITY = new Map([
  ['vhigh', 'high'],
  ['high', 'mid'],
  ['mid', 'mid'],
  ['track', 'track'],
])

// `STEP 01 · 3주`, `STEP 01와 병행`, `STEP 01` 에서 번호만 집는다.
//
// 단계 번호는 `project_steps[].phase` 와 `study_tracks[].phase` 와
// `check_rows[].source_step` 세 곳에 글자로 들어간다. 순서를 바꾸면 세 곳이 함께 움직여야
// 하므로 번호만 갈아 끼운다. 나머지 글자(기간, `와 병행`)는 건드리지 않는다.
const STEP_NUMBER = /(STEP\s*)(\d+)/g

// 파이썬 `if value` 와 같은 참·거짓 판정.
// JSON 값만 들어오므로 빈 배열·빈 객체까지만 맞추면 두 구현이 갈라지지 않는다.
// (자바스크립트는 `[]` 를 참으로 보지만 파이썬은 거짓으로 본다.)
function isTruthy(value) {
  if (Array.isArray(value)) return value.length > 0
  if (value !== null && typeof value === 'object') return Object.keys(value).length > 0
  return Boolean(value)
}

// 파이썬 `str(mapping.get(key, ''))` 에 맞춘 문자열 읽기.
// 키가 없거나 비어 있으면 빈 문자열이다. 저장된 payload 의 `phase`·`source_step` 은 항상
// 문자열이므로 다른 형이 들어오면 그대로 문자열로 바꾼다.
function asText(value) {
  if (value === undefined || value === null) return ''
  return String(value)
}

/**
 * 보유로 표시된 개념 식별자.
 *
 * 값이 거짓인 키는 보유가 아니다. 브라우저가 체크를 껐다 켠 흔적으로 거짓을 함께 보내므로,
 * 키가 있다는 것만으로 보유로 읽으면 끈 체크가 되살아난다.
 */
function heldConcepts(checks) {
  const held = new Set()
  if (!checks || typeof checks !== 'object') return held
  for (const [key, value] of Object.entries(checks)) {
    if (isTruthy(value)) held.add(key)
  }
  return held
}

function fillIds(entry) {
  const fills = entry && entry.fills
  if (!Array.isArray(fills)) return []
  return fills
    .filter((fill) => fill !== null && typeof fill === 'object' && !Array.isArray(fill) && isTruthy(fill.item_id))
    .map((fill) => String(fill.item_id))
}

/**
 * 이 단계가 채우는 것을 이미 다 가졌는가.
 *
 * 채우는 것이 하나도 없는 단계는 보유로 보지 않는다. 코딩테스트 트랙처럼 체크리스트 항목을
 * 갖지 않는 자리가 있고, 그것을 보유로 읽으면 체크와 무관하게 늘 뒤로 밀린다.
 */
function isHeld(entry, held) {
  const ids = fillIds(entry)
  return ids.length > 0 && ids.every((itemId) => held.has(itemId))
}

/**
 * 미보유를 앞, 보유를 뒤로 보낸 **자리 번호**를 돌려준다.
 *
 * 항목 자체가 아니라 자리 번호를 돌려주는 이유는 옛 번호와 새 번호를 잇는 표가 필요하기
 * 때문이다. 항목만 있으면 같은 내용의 단계가 둘일 때 어느 것이 몇 번이던 것인지 되찾을 수 없다.
 *
 * 안정 정렬이라 선수 관계가 정한 순서가 무리 안에서 유지된다. 보유 단계끼리도 원래 순서를
 * 지키므로 체크를 되돌리면 원래 배열로 돌아온다. 자리 번호를 두 번째 정렬 키로 두어
 * 실행 환경의 정렬 안정성에 기대지 않는다.
 */
function reordered(entries, held) {
  const flags = entries.map((entry) => isHeld(entry, held))
  const order = entries
    .map((_, index) => index)
    .sort((a, b) => (flags[a] === flags[b] ? a - b : (flags[a] ? 1 : 0) - (flags[b] ? 1 : 0)))
  return { order, flags: order.map((index) => flags[index]) }
}

// 글자 안의 단계 번호를 새 번호로 바꾼다. 모르는 번호는 그대로 둔다.
function renumber(text, mapping) {
  return text.replace(STEP_NUMBER, (matched, head, digits) => {
    const next = mapping.get(Number(digits))
    return next === undefined ? matched : `${head}${String(next).padStart(2, '0')}`
  })
}

// 보유 단계의 우선순위를 한 칸 내린 값. 표에 없는 값은 그대로 둔다.
function loweredPriority(entry) {
  const priority = asText(entry.priority)
  const lowered = LOWER_PRIORITY.get(priority)
  return lowered === undefined ? priority : lowered
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

/**
 * 체크 상태를 반영해 저장된 로드맵의 순서와 우선순위를 다시 짠다.
 *
 * - 채우는 개념을 이미 다 가진 단계는 뒤로 밀고 우선순위를 한 칸 내린다.
 * - 남은 단계의 번호를 1 부터 다시 매기고 `phase` 의 번호를 함께 고친다.
 * - 보유한 개념의 `check_rows[].source_step` 을 `보유` 로 바꾸고, 나머지는 새 단계 번호를
 *   가리키게 고친다.
 *
 * 입력 payload 를 바꾸지 않는다. 돌려주는 것은 새 객체다.
 */
function recompose(payload, checks) {
  const held = heldConcepts(checks)

  const steps = asArray(payload && payload.project_steps)
  const tracks = asArray(payload && payload.study_tracks)
  const rows = asArray(payload && payload.check_rows)

  const stepPlan = reordered(steps, held)
  // 옛 번호 → 새 번호. `n` 이 없으면 저장된 배열 자리를 번호로 본다.
  const mapping = new Map()
  stepPlan.order.forEach((old, position) => {
    const step = steps[old]
    const oldNumber = step && step.n !== undefined ? Number(step.n) : old + 1
    mapping.set(oldNumber, position + 1)
  })

  const newSteps = stepPlan.order.map((old, position) => {
    const step = steps[old]
    const entry = { ...step }
    entry.n = position + 1
    entry.phase = renumber(asText(step.phase), mapping)
    if (stepPlan.flags[position]) entry.priority = loweredPriority(step)
    return entry
  })

  const trackPlan = reordered(tracks, held)
  const newTracks = trackPlan.order.map((old, position) => {
    const track = tracks[old]
    const entry = { ...track }
    entry.phase = renumber(asText(track.phase), mapping)
    if (trackPlan.flags[position]) entry.priority = loweredPriority(track)
    return entry
  })

  const newRows = rows.map((row) => {
    const entry = { ...row }
    if (held.has(asText(row.item_id))) {
      entry.source_step = HELD_LABEL
    } else {
      entry.source_step = renumber(asText(row.source_step), mapping)
    }
    return entry
  })

  return {
    ...payload,
    project_steps: newSteps,
    study_tracks: newTracks,
    check_rows: newRows,
  }
}

module.exports = { HELD_LABEL, LOWER_PRIORITY, heldConcepts, recompose }
