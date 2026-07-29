// 체크 상태를 반영한 로드맵 재조합 (화면 사본).
//
// 기준 구현은 `server/src/recompose.js` 이고, 그 기준은 다시 파이썬
// `agent/src/careersignal/agents/roadmap/recompose.py` 다. 규칙은 여기서 바꾸지 않는다.
//
// 이 사본이 필요한 이유는 하나다. 사용자가 붙여넣은 공고(`myPosting`)의 로드맵은
// `POST /api/roadmap` 이 조회할 수 있는 저장된 산출물이 아니라 이미 받아 둔 payload 라서,
// 체크를 껐다 켤 때 서버에 다시 물을 수 없다. 기업군·개별 공고 범위는 지금처럼 서버가
// 재조합하고, 내가 입력한 공고만 이 함수가 화면에서 같은 규칙으로 재조합한다.
//
// 두 구현이 갈라지면 같은 체크에 다른 순서가 나오므로 `recompose.test.js` 가 서버와 같은
// fixture(`server/src/__fixtures__/recompose-cases.json`)를 전량 대조한다.
//
// 순수 함수다. payload 와 체크 맵을 받아 새 payload 를 돌려주며 입력을 고치지 않는다.

// 이미 채운 개념의 `check_rows[].source_step`.
export const HELD_LABEL = '보유'

// 이미 채운 단계의 우선순위를 한 칸 내린다. `track` 은 순위가 아니라 갈래이므로 내리지 않는다.
const LOWER_PRIORITY = new Map([
  ['vhigh', 'high'],
  ['high', 'mid'],
  ['mid', 'mid'],
  ['track', 'track'],
])

// `STEP 01 · 3주`, `STEP 01와 병행`, `STEP 01` 에서 번호만 집는다.
const STEP_NUMBER = /(STEP\s*)(\d+)/g

// 파이썬 `if value` 와 같은 참·거짓 판정.
// 자바스크립트는 `[]` 를 참으로 보지만 파이썬은 거짓으로 보므로 빈 배열·빈 객체를 맞춘다.
function isTruthy(value) {
  if (Array.isArray(value)) return value.length > 0
  if (value !== null && typeof value === 'object') return Object.keys(value).length > 0
  return Boolean(value)
}

// 파이썬 `str(mapping.get(key, ''))` 에 맞춘 문자열 읽기.
function asText(value) {
  if (value === undefined || value === null) return ''
  return String(value)
}

/**
 * 보유로 표시된 개념 식별자.
 *
 * 값이 거짓인 키는 보유가 아니다. 체크를 껐다 켠 흔적으로 거짓이 함께 들어오므로,
 * 키가 있다는 것만으로 보유로 읽으면 끈 체크가 되살아난다.
 */
export function heldConcepts(checks) {
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
 * 채우는 것이 하나도 없는 단계는 보유로 보지 않는다. 체크리스트 항목을 갖지 않는 트랙이
 * 있고, 그것을 보유로 읽으면 체크와 무관하게 늘 뒤로 밀린다.
 */
function isHeld(entry, held) {
  const ids = fillIds(entry)
  return ids.length > 0 && ids.every((itemId) => held.has(itemId))
}

/**
 * 미보유를 앞, 보유를 뒤로 보낸 자리 번호를 돌려준다.
 *
 * 항목이 아니라 자리 번호를 돌려주는 이유는 옛 번호와 새 번호를 잇는 표가 필요하기 때문이다.
 * 자리 번호를 두 번째 정렬 키로 두어 실행 환경의 정렬 안정성에 기대지 않는다.
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
 * 체크 상태를 반영해 로드맵의 순서와 우선순위를 다시 짠다.
 *
 * - 채우는 개념을 이미 다 가진 단계는 뒤로 밀고 우선순위를 한 칸 내린다. 버리지 않는다.
 * - 남은 단계의 번호를 1 부터 다시 매기고 `phase` 의 번호를 함께 고친다.
 * - 보유한 개념의 `check_rows[].source_step` 을 `보유` 로 바꾸고, 나머지는 새 단계 번호를
 *   가리키게 고친다.
 */
export function recompose(payload, checks) {
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
