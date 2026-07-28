// 한 판(트레이) 통합 분석(5주차 §3-B) 프롬프트 — mealPortions.js(assignTrayWeights)가 이미 정한
// 역할·중량을 그대로 근거로 주고, 각 메뉴의 영양 성분 추정만 맡긴다. 사진/텍스트 분석 프롬프트와
// 달리 "무엇을 먹었는지 식별"하는 단계가 없다 — 메뉴판에 뭐가 있는지는 이미 알고 있고, 각 항목이
// 몇 g인지도 이미 정해져 있어서다(재현 가능성 — 같은 메뉴 조합이면 항상 같은 중량 기준으로 추정).
const REQUIRED_NUTRIENT_KEYS = ['calories', 'protein', 'carbs', 'fat', 'sodium', 'fiber']

function formatAmount(item) {
  const unit = item.role === 'drink' ? 'ml' : 'g'
  return `${item.name} (${item.weight}${unit})`
}

// trayItems: mealPortions.assignTrayWeights()의 반환값([{name, role, weight}]).
export function buildTrayAnalysisPrompt(trayItems) {
  const itemLines = trayItems.map((item) => `- ${formatAmount(item)}`).join('\n')

  return `당신은 한국 음식 영양 분석 전문가입니다. 아래는 한 끼 식판에 담긴 메뉴와 각 메뉴의 명시된 섭취량입니다. 각 항목을 그 중량 기준으로 영양성분을 추정하세요(중량은 이미 정해진 값이니 임의로 바꾸지 마세요).

[메뉴 목록]
${itemLines}

각 항목마다 calories(kcal), protein(g), carbs(g), fat(g), sodium(mg), fiber(g) 여섯 값을 모두 추정하고, 전체 항목을 합산한 total도 함께 계산하세요. 과대추정하지 말고 한국 표준 식단 기준 현실적인 범위로 추정하세요.

설명이나 마크다운 없이, 아래 형식과 정확히 일치하는 JSON만 반환하세요:
{"items":[{"name":"메뉴명","weight":210,"calories":0,"protein":0,"carbs":0,"fat":0,"sodium":0,"fiber":0}],"total":{"calories":0,"protein":0,"carbs":0,"fat":0,"sodium":0,"fiber":0}}`
}

function isValidNutrientRecord(value) {
  return Boolean(value) && REQUIRED_NUTRIENT_KEYS.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]))
}

// raw: geminiComplete()가 반환한 원문(마크다운 펜스가 섞여 있을 수 있음). 유효하지 않으면 null —
// 호출부가 1회 재요청 후에도 null이면 "통합 분석 실패" 안내로 전환한다.
export function parseTrayAnalysisResult(raw) {
  if (typeof raw !== 'string') return null

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced ? fenced[1] : raw).trim()

  let parsed
  try {
    parsed = JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return null
    try {
      parsed = JSON.parse(candidate.slice(start, end + 1))
    } catch {
      return null
    }
  }

  const items = parsed?.items
  if (!Array.isArray(items) || items.length === 0) return null
  const validItems = items.filter((item) => item && typeof item.name === 'string' && isValidNutrientRecord(item))
  if (validItems.length !== items.length) return null
  if (!isValidNutrientRecord(parsed.total)) return null

  return { items: validItems, total: parsed.total }
}
