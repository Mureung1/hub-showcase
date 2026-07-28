// AI 식습관 분석(5주차 §5, 4주차 §3 개편) 프롬프트 — 집계 요약 수치만 근거로 쓰고, 원본 끼니 기록이나
// 개인 식별 정보는 절대 프롬프트에 담지 않는다. 프롬프트 조립을 이 파일 하나로 분리해, 화면 코드
// (DietAnalysisCard.jsx)는 요청을 어떻게 구성하는지 몰라도 되게 한다.
//
// 5주차부터 응답을 자유 문단 대신 findings 배열(JSON)로 강제한다 — 각 finding은 한 줄 요약 +
// 근거 포함 설명 + good/warn/tip 분류를 갖는다. warn 항목은 반드시 [집계 요약]의 실제 숫자를
// 인용해야 한다("AI가 지어낸 위치"를 막기 위함) — 요약에 없는 숫자를 쓰면 검증 불가능하므로,
// 프롬프트에 절대 섭취량(avgIntake)까지 함께 실어 모델이 근거 삼을 실수를 그대로 인용하게 한다.
import { NUTRIENT_LABELS } from '../nutrition.js'

const MIN_FINDINGS = 4
const MAX_FINDINGS = 6
const VALID_TYPES = new Set(['good', 'warn', 'tip'])

function formatStatLine(summary) {
  const parts = NUTRIENT_LABELS.map(({ key, label, unit }) => {
    const avg = summary.avgIntake?.[key]
    if (avg == null) return null
    const rate = summary.achievementRates?.[key]
    const rateText = rate == null ? '' : `(권장 대비 ${rate}%)`
    return `${label} 일평균 ${avg}${unit}${rateText}`
  }).filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '집계 정보 없음'
}

// summary: dietSummary.buildDietSummary()의 반환값(null이 아닌 경우만 호출부가 넘긴다).
// periodDays: 7 | 30 — 사용자가 고른 분석 기간 옵션(FR-3.1).
export function buildDietAnalysisPrompt(summary, periodDays) {
  const { startDate, endDate, recordedDays, topFoods, exceededNutrients, deficientNutrients } = summary

  const topFoodsLine = topFoods.length > 0 ? topFoods.map((f) => `${f.name}(${f.count}회)`).join(', ') : '없음'
  const exceededLine = exceededNutrients.length > 0 ? exceededNutrients.join(', ') : '없음'
  const deficientLine = deficientNutrients.length > 0 ? deficientNutrients.join(', ') : '없음'

  return `당신은 신뢰할 수 있는 영양 코치입니다. 아래는 사용자의 최근 ${periodDays}일(${startDate} ~ ${endDate}, 실제 기록 ${recordedDays}일) 식단 집계 요약입니다. 반드시 이 수치만 근거로 삼아 JSON으로 피드백을 작성하세요 — 숫자를 인용할 땐 아래 [집계 요약]에 있는 값 그대로 쓰고, 스스로 새 숫자를 지어내지 마세요.

[집계 요약]
- 영양소별 일평균 섭취량: ${formatStatLine(summary)}
- 자주 등장한 음식: ${topFoodsLine}
- 과다 섭취 경향(달성률 130% 초과): ${exceededLine}
- 부족 섭취 경향(달성률 70% 미만): ${deficientLine}

[출력 형식] 다른 설명 없이 아래 구조의 JSON 하나만 반환하세요.
{"findings":[{"summary":"한 문장 요약","detail":"1~2문장 존댓말 설명","type":"good"}, ...]}

[작성 규칙]
1. findings는 ${MIN_FINDINGS}~${MAX_FINDINGS}개.
2. type="good" 최소 1개 포함 — 잘하고 있는 점.
3. type="warn" 1~3개 — 주의해야 할 섭취 패턴. detail에 반드시 위 [집계 요약]의 실제 수치를 인용해
   근거를 밝히세요. 예: "최근 ${periodDays}일 평균 나트륨 3,700mg으로 권장량 2,000mg의 185%예요. 국물
   섭취가 잦을 때 특히 높아져요."
4. type="tip" 1~2개 — 구체적인 실천 제안.
5. summary는 1문장으로 짧게, detail은 1~2문장 존댓말로.
6. 위 [집계 요약]에 없는 날짜별 세부 기록이나 개인 식별 정보는 절대 언급하지 마세요 — 당신은 그
   정보를 모릅니다.
7. "~병 위험이 있습니다", "치료가 필요합니다" 같은 질병 진단·치료 표현은 절대 쓰지 마세요. 어디까지나
   습관 코칭입니다.
8. 마크다운 코드펜스나 설명 문장 없이 순수 JSON 텍스트만 반환하세요.`
}

// raw: geminiComplete()가 반환한 원문 텍스트(마크다운 펜스가 섞여 있을 수 있음). parseJsonLoose와
// 별개로 이 파일에 두는 이유는 findings 배열의 구조 검증(개수·good 최소 1개·type 값)까지 이 함수
// 하나로 끝내, 호출부(DietAnalysisCard.jsx)는 "유효한 findings 아니면 null"만 보면 되게 하기 위함.
export function parseDietAnalysisFindings(raw) {
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

  const findings = parsed?.findings
  if (!Array.isArray(findings) || findings.length < MIN_FINDINGS || findings.length > MAX_FINDINGS) return null

  const cleaned = findings.filter(
    (f) =>
      f &&
      typeof f.summary === 'string' &&
      f.summary.trim().length > 0 &&
      typeof f.detail === 'string' &&
      f.detail.trim().length > 0 &&
      VALID_TYPES.has(f.type),
  )
  if (cleaned.length !== findings.length) return null
  if (!cleaned.some((f) => f.type === 'good')) return null

  return cleaned
}

export function isDietAnalysisValid(raw) {
  return parseDietAnalysisFindings(raw) !== null
}

export const DIET_ANALYSIS_MIN_FINDINGS = MIN_FINDINGS
export const DIET_ANALYSIS_MAX_FINDINGS = MAX_FINDINGS
