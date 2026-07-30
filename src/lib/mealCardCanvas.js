// 인증샷 카드(FR-2)의 뱃지 판정 + 캔버스 드로잉. 판정 로직은 순수 함수로 분리해 테스트 가능하게 하고,
// 컴포넌트(MealCardExporter.jsx)는 이 함수들만 호출한다.
import { isMet, SODIUM_LIMIT_MG } from './nutrientCriteria.js'

export const TEMPLATES = {
  story: { key: 'story', label: '스토리', width: 1080, height: 1920 },
  feed: { key: 'feed', label: '피드', width: 1080, height: 1080 },
}

// 이 끼니 하나의 나트륨이 하루 상한(SODIUM_LIMIT_MG, nutrientCriteria.js 단일 소스)의 절반을
// 넘으면 "한 끼치고 많다"는 신호로 본다 — 새 숫자를 만들지 않고 기존 상수에서 파생만 한다.
const SODIUM_WARNING_MG = SODIUM_LIMIT_MG / 2
// 단백질 칼로리 비중이 25% 이상이면 "고단백"으로 보는 것은 영양학에서 흔히 쓰는 일반적인 기준이다
// (단백질 1g = 4kcal). 이 프로젝트에 이미 있는 상수가 아니라 새로 들여온 값이라는 걸 명시해둔다.
const HIGH_PROTEIN_CALORIE_RATIO = 0.25
const PROTEIN_KCAL_PER_G = 4

// 저장 직전(또는 직후) 시점의 "오늘 누적" 점수를 보여주려면 이미 저장된 오늘 총합에 방금 분석한
// 끼니를 더해야 한다 — AnalysisResultCard는 저장 성공과 동시에 언마운트되므로(resetToIdle) 저장 후
// todayMealsTotal이 갱신되길 기다릴 수 없다. 두 영양소 객체를 키별로 단순 합산한다.
export function mergeNutrientTotals(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})])
  return Object.fromEntries([...keys].map((key) => [key, (a?.[key] || 0) + (b?.[key] || 0)]))
}

export function buildMealBadges(mealTotal) {
  const badges = []
  const calories = mealTotal?.calories ?? 0
  const protein = mealTotal?.protein ?? 0
  const sodium = mealTotal?.sodium ?? 0

  if (calories > 0 && (protein * PROTEIN_KCAL_PER_G) / calories >= HIGH_PROTEIN_CALORIE_RATIO) {
    badges.push('#고단백')
  }
  if (sodium >= SODIUM_WARNING_MG || !isMet('sodium', sodium, SODIUM_LIMIT_MG)) {
    badges.push('#나트륨주의')
  }
  return badges
}

// ctx에 카드를 그린다. photoImage는 이미 로드된 HTMLImageElement(또는 동등한 drawImage 가능 객체).
export function drawMealCard(ctx, { photoImage, width, height, score, badges, watermark = 'Mealyze' }) {
  // 배경 사진 — cover 방식(가로세로 비율이 캔버스와 달라도 잘리지 않고 꽉 채움)
  const imgRatio = photoImage.width / photoImage.height
  const canvasRatio = width / height
  let drawWidth = width
  let drawHeight = height
  let offsetX = 0
  let offsetY = 0
  if (imgRatio > canvasRatio) {
    drawHeight = height
    drawWidth = height * imgRatio
    offsetX = (width - drawWidth) / 2
  } else {
    drawWidth = width
    drawHeight = width / imgRatio
    offsetY = (height - drawHeight) / 2
  }
  ctx.drawImage(photoImage, offsetX, offsetY, drawWidth, drawHeight)

  // 하단 그라디언트 오버레이(텍스트 가독성)
  const overlayHeight = height * 0.4
  const gradient = ctx.createLinearGradient(0, height - overlayHeight, 0, height)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.75)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, height - overlayHeight, width, overlayHeight)

  // 점수
  if (typeof score === 'number') {
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.round(width * 0.09)}px sans-serif`
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(`${score}점`, width * 0.06, height - height * 0.18)
  }

  // 뱃지
  ctx.font = `${Math.round(width * 0.035)}px sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillText(badges.join('  '), width * 0.06, height - height * 0.1)

  // 워터마크
  ctx.font = `${Math.round(width * 0.03)}px sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.textAlign = 'right'
  ctx.fillText(watermark, width * 0.94, height * 0.96)
  ctx.textAlign = 'left'
}
