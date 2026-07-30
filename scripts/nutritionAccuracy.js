// 영양 정확도 리포트 — **무과금·오프라인**. 식약처 DB가 스스로 갖고 있는 실측값을 정답지로 쓴다.
//
//   node scripts/nutritionAccuracy.js            (전체)
//   node scripts/nutritionAccuracy.js restaurant (식당 경로만)
//
// ── 왜 이 스크립트가 1차 게이트인가 ──
// 이 저장소의 정확도 측정은 오랫동안 precisionEngineAccuracy.js(NEIS 급식 20건) 하나뿐이었다.
// 그건 ① **유료**(OpenRouter 호출) ② 표본 20건 ③ 급식 항목의 42%가 DB에 아예 없어 공식 열량의
// 48%를 LLM이 채운다 — 즉 규칙을 바꿔도 통과 개수가 LLM 출력에 좌우돼 신호가 묻힌다.
// 여기서는 반대로, **DB가 이미 알고 있는 실측 1회 제공량**을 정답지로 삼아 8천 건 규모로 잰다.
// 과금이 없으므로 규칙을 고칠 때마다 돌릴 수 있다.
//
// ── 무엇을 재는가 ──
//
//   [1] 1인분 hold-out (핵심)
//       레코드가 가진 **진짜 1회 제공량을 가리고** 우리 규칙(정량 사전 + 역할 표준)만으로 예측해
//       맞춰본다. 이게 실제 앱에서 벌어지는 상황이다 — 식약처 레코드 11,347건 중 998건은 제공량이
//       아예 없고, 871건은 기준량 placeholder(정확히 100g)가 새어 들어와 있어 못 쓴다. 그때
//       우리 폴백이 얼마나 현실에 가까운지가 곧 "돼지갈비 73kcal"이 다시 나올지를 가른다.
//
//   [2] 근거 폐기율
//       반대 방향의 실패 — 레코드에 **진짜 제공량이 있는데도** 우리가 이상치라며 버리는 비율.
//       예전 비율 가드가 "50g 기준으로 220g은 4.4배 이상치"라며 정답을 버린 게 이 유형이었다.
//       버릴 때마다 [1]의 폴백 품질에 의존하게 되므로, 폐기율은 낮을수록 좋다.
//
//   [3] 출처 선택 불변식 (PASS/FAIL — 이것만 종료 코드에 반영)
//       식당 맥락은 외식 출처를, 급식 맥락은 급식 출처를 골라야 한다. 빌드가 다시 출처를 버리거나
//       ORIGIN_PREFERENCE가 깨지면 여기서 잡힌다.
//
//   [4] 출처 간 격차 (참고)
//       같은 음식의 식당 수치와 급식 수치가 얼마나 다른지 — 이 격차가 곧 [3]이 지키는 것의 크기다.
//
// ── 재지 않는 것(정직하게) ──
// 절대적인 "진짜 칼로리"는 알 수 없다(알면 DB가 필요 없다). [1]/[2]는 **1인분 중량 결정**만 잰다.
// 영양밀도(100g당 수치)의 정확성은 [3]/[4]가 간접적으로만 다룬다. 실제 조리·배식 편차까지 포함한
// end-to-end 정확도는 여전히 precisionEngineAccuracy.js(유료, NEIS 공식 수치 대비)의 몫이다.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isUsableServingGram, resolveStandardServingGram } from '../server/nutrition/servingWeight.js'
import { lookupFood, pickVariantForContext } from '../server/nutrition/foodLookup.js'
import { PORTION_FACTORS } from '../server/nutrition/precisionEngine.js'
import { clampToPlausibleNutrients } from '../src/lib/nutrition.js'
import { foodNameSimilarity, FOOD_MATCH_SIMILARITY_THRESHOLD } from '../src/lib/foodMatch.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'server', 'data', 'foodDB.json')
const NEIS_PATH = path.join(__dirname, '..', 'server', 'data', 'neisMealSamples.json')

// [6]에서 쓰는 상한. DB로 매칭된 항목만 합산하므로 이 합계는 공식 열량을 **넘을 수 없다**(나머지는
// Gemini 추정이 채운다). 넘긴 끼니 수가 곧 중량 규칙이 과대평가하고 있다는 직접 증거다.
const MAX_OVERSHOOT_MEALS = 8

// foodLookup.js의 ORIGIN_PREFERENCE와 반드시 같아야 한다(어긋나면 [3]이 거짓 PASS를 낸다).
const PREFERENCE = {
  restaurant: ['2', '3', '1', '4', '6', '5', '7'],
  packaged: ['2', '1', '3', '4', '6', '5', '7'],
  cafeteria: ['6', '5', '7', '3', '1', '4', '2'],
}

const RESTAURANT_ORIGINS = new Set(['2', '3', '4', '1'])
const CAFETERIA_ORIGINS = new Set(['6', '5', '7'])

// 정답지 세 벌 — 어느 출처의 제공량을 "그 맥락의 실제 1인분"으로 볼지.
const GROUND_TRUTH = [
  { label: '프랜차이즈 공식 1회 제공량', origins: new Set(['2']), context: 'packaged' },
  { label: '외식·가정식 분석 제공량', origins: new Set(['3', '1', '4']), context: 'restaurant' },
  { label: '급식 실제 배식량', origins: new Set(['5', '6', '7']), context: 'cafeteria' },
]

// 이 오차 안이면 통과로 센다. 1인분 중량은 조리·배식 편차가 커서 급식 벤치마크(20%)보다 느슨하다.
const ERROR_THRESHOLD_PCT = 25

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0)
const pct = (n, total) => (total > 0 ? ((n / total) * 100).toFixed(1) : '0.0')

function pickVariant(variants, context) {
  for (const code of PREFERENCE[context]) {
    const hit = variants.find((v) => v.originCode === code)
    if (hit) return hit
  }
  return null
}

// 정답으로 쓸 제공량인지 — placeholder(100g)와 결측은 정답지에서 뺀다(그건 우리가 맞출 대상이
// 아니라 애초에 정보가 없는 레코드다).
function truthServingGram(variant) {
  const g = variant?.servingGram
  return isUsableServingGram(g) ? g : null
}

function collectSamples(items, origins) {
  const samples = []
  for (const item of items) {
    for (const variant of item.variants ?? []) {
      if (!origins.has(variant.originCode)) continue
      const truth = truthServingGram(variant)
      if (truth === null) continue
      samples.push({ name: item.name, truth })
      break // 음식 하나당 한 표 — 레코드가 많은 음식(피자 2,438건)이 통계를 지배하지 않게
    }
  }
  return samples
}

function report(label, errors) {
  const pass = errors.filter((e) => e <= ERROR_THRESHOLD_PCT).length
  console.log(
    `    ${label.padEnd(26)} ${String(errors.length).padStart(5)}건  ` +
      `평균 ${mean(errors).toFixed(1).padStart(5)}%  중앙값 ${median(errors).toFixed(1).padStart(5)}%  ` +
      `통과(≤${ERROR_THRESHOLD_PCT}%) ${pct(pass, errors.length).padStart(5)}%`,
  )
  return { n: errors.length, mean: mean(errors), pass: pass / Math.max(1, errors.length) }
}

function main() {
  const only = process.argv[2] ?? null
  const db = JSON.parse(readFileSync(DB_PATH, 'utf8'))
  if (!db.items.some((i) => Array.isArray(i.variants))) {
    console.error('foodDB.json에 variants[]가 없습니다 — `node scripts/buildFoodDB.js`로 먼저 재빌드하세요.')
    process.exit(1)
  }

  // ── [1] 1인분 hold-out ──────────────────────────────────────────────────────
  console.log(`[1] 1인분 hold-out — DB의 실제 제공량을 **가리고** 정량 사전+역할 표준만으로 예측`)
  for (const { label, origins, context } of GROUND_TRUTH) {
    if (only && only !== context) continue
    const samples = collectSamples(db.items, origins)
    // dbServingGram에 null을 넘긴다 = "이 음식의 제공량을 모르는 상태"를 그대로 재현한다.
    const errors = samples.map((s) => (Math.abs(resolveStandardServingGram(s.name, null, { context }) - s.truth) / s.truth) * 100)
    report(label, errors)
  }

  // ── [2] 근거 폐기율 ─────────────────────────────────────────────────────────
  console.log(`\n[2] 근거 폐기율 — 진짜 제공량이 있는데 규칙이 버리는 비율(낮을수록 좋다)`)
  for (const { label, origins, context } of GROUND_TRUTH) {
    if (only && only !== context) continue
    const samples = collectSamples(db.items, origins)
    let discarded = 0
    const keptErrors = []
    for (const s of samples) {
      const resolved = resolveStandardServingGram(s.name, s.truth, { context })
      if (resolved === s.truth) keptErrors.push(0)
      else {
        discarded += 1
        keptErrors.push((Math.abs(resolved - s.truth) / s.truth) * 100)
      }
    }
    console.log(
      `    ${label.padEnd(26)} ${String(samples.length).padStart(5)}건  ` +
        `폐기 ${pct(discarded, samples.length).padStart(5)}%  최종 평균오차 ${mean(keptErrors).toFixed(1).padStart(5)}%`,
    )
  }

  // ── [3] 출처 선택 불변식 ────────────────────────────────────────────────────
  const violations = []
  for (const item of db.items) {
    const variants = item.variants ?? []
    if (variants.some((v) => RESTAURANT_ORIGINS.has(v.originCode))) {
      const picked = pickVariant(variants, 'restaurant')
      if (!RESTAURANT_ORIGINS.has(picked?.originCode)) violations.push(`${item.name}: 식당 맥락인데 급식 출처(${picked?.originCode})`)
    }
    if (variants.some((v) => CAFETERIA_ORIGINS.has(v.originCode))) {
      const picked = pickVariant(variants, 'cafeteria')
      if (!CAFETERIA_ORIGINS.has(picked?.originCode)) violations.push(`${item.name}: 급식 맥락인데 외식 출처(${picked?.originCode})`)
    }
  }

  console.log(`\n[3] 출처 선택 불변식 — ${db.items.length}종 검사`)
  if (violations.length === 0) {
    console.log('    위반 없음: 식당 맥락은 항상 외식 출처를, 급식 맥락은 항상 급식 출처를 고른다.')
  } else {
    console.log(`    위반 ${violations.length}건:`)
    for (const v of violations.slice(0, 10)) console.log(`      - ${v}`)
  }

  // ── [4] 출처 간 격차 ────────────────────────────────────────────────────────
  const split = []
  for (const item of db.items) {
    const variants = item.variants ?? []
    const r = pickVariant(variants.filter((v) => RESTAURANT_ORIGINS.has(v.originCode)), 'restaurant')
    const c = pickVariant(variants.filter((v) => CAFETERIA_ORIGINS.has(v.originCode)), 'cafeteria')
    const rk = r?.nutrientsPer100?.calories
    const ck = c?.nutrientsPer100?.calories
    if (!(rk > 0) || !(ck > 0)) continue
    split.push({ name: item.name, restaurant: rk, cafeteria: ck, gap: (Math.abs(ck - rk) / rk) * 100 })
  }
  split.sort((a, b) => b.gap - a.gap)
  console.log(`\n[4] 두 출처를 다 가진 음식 ${split.length}종 — 급식 수치를 식당에 쓰면 벌어지는 격차`)
  console.log(`    평균 ${mean(split.map((s) => s.gap)).toFixed(1)}% · 중앙값 ${median(split.map((s) => s.gap)).toFixed(1)}%`)
  console.log('      음식                            식당    급식     격차')
  for (const s of split.slice(0, 8)) {
    console.log(
      `      ${s.name.slice(0, 28).padEnd(30)}${String(s.restaurant).padStart(6)}${String(s.cafeteria).padStart(8)}${(s.gap.toFixed(0) + '%').padStart(8)}`,
    )
  }

  // ── [5] 영양밀도 hold-out (참고) ────────────────────────────────────────────
  // [1]/[2]는 **중량**만 잰다. 밀도(100g당 수치)도 재려면 정답이 있는 레코드를 가리고 나머지 출처로
  // 예측해봐야 하는데, 프랜차이즈 공식(2)과 다른 출처를 **둘 다** 가진 음식이 13종뿐이라 신호가 약하다.
  // 그래도 0은 아니고 방향은 볼 수 있어서 남긴다 — 이 수치 하나로 튜닝하지는 말 것.
  const densityErrors = []
  for (const item of db.items) {
    const variants = item.variants ?? []
    const truth = variants.find((v) => v.originCode === '2')?.nutrientsPer100?.calories
    const heldOut = pickVariant(variants.filter((v) => v.originCode !== '2'), 'restaurant')?.nutrientsPer100?.calories
    if (!(truth > 0) || !(heldOut > 0)) continue
    densityErrors.push((Math.abs(heldOut - truth) / truth) * 100)
  }
  const densityPass = densityErrors.filter((e) => e <= ERROR_THRESHOLD_PCT).length
  console.log(`\n[5] 영양밀도 hold-out — 프랜차이즈 공식 수치 대비 ${densityErrors.length}종 (표본 작음, 참고용)`)
  console.log(`    평균 ${mean(densityErrors).toFixed(1)}% · 오차 ≤${ERROR_THRESHOLD_PCT}% ${densityPass}/${densityErrors.length}`)

  // ── [6] NEIS 실제 급식 대비 과대평가 ────────────────────────────────────────
  // [1]/[2]는 DB 레코드 하나하나를 보지만, 실제 사고는 "한 판 전체가 부풀어 오르는" 형태로 온다.
  // 여기서는 NEIS 공식 열량이 있는 실제 끼니를 그대로 재현해, **DB로 매칭된 항목만의 합계**가
  // 공식 열량을 넘는 끼니가 몇 개인지 센다. 매칭분은 전체의 부분집합이므로 넘으면 그 자체로 오류다.
  //
  // 이 지표를 넣은 이유: 급식 중량 규칙이 "역할 미상이면 식당 1인분/외식 포장량으로 폴백"하도록
  // 바뀌었을 때 [1][2][3] 어디에도 안 잡혔는데 여기서는 5→13끼로 즉시 드러났다.
  const neis = JSON.parse(readFileSync(NEIS_PATH, 'utf8')).filter((s) => s.officialCalories > 0)
  const TRUSTED = new Set(['exact', 'alias'])
  let overshoot = 0
  let sumMatched = 0
  let sumOfficial = 0
  for (const sample of neis) {
    const factor = PORTION_FACTORS[sample.schoolType] ?? 1
    let kcal = 0
    for (const menu of sample.menus) {
      const raw = lookupFood(menu)
      if (!raw) continue
      const verified = TRUSTED.has(raw.matchType) || foodNameSimilarity(menu, raw.item.name) >= FOOD_MATCH_SIMILARITY_THRESHOLD
      if (!verified) continue
      const item = pickVariantForContext(raw.item, 'cafeteria')
      const grams = Math.round(
        resolveStandardServingGram(menu, item.servingGram, {
          context: 'cafeteria',
          roleHint: item.categoryMatched ? item.category : null,
        }) * factor,
      )
      const per100 = item.nutrientsPer100
      const scaled = {}
      for (const key of ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium']) {
        scaled[key] = typeof per100[key] === 'number' ? (per100[key] * grams) / 100 : null
      }
      kcal += clampToPlausibleNutrients(scaled, menu, grams).calories ?? 0
    }
    sumMatched += kcal
    sumOfficial += sample.officialCalories
    if (kcal > sample.officialCalories) overshoot += 1
  }
  const overshootOk = overshoot <= MAX_OVERSHOOT_MEALS
  console.log(`\n[6] NEIS 실제 급식 ${neis.length}끼 — DB 매칭분만의 합계가 공식 열량을 넘는가`)
  console.log(`    DB매칭분/공식 ${pct(sumMatched, sumOfficial)}%  ·  공식 초과 끼니 ${overshoot}끼 (허용 ${MAX_OVERSHOOT_MEALS})`)
  if (!overshootOk) console.log('    ⚠️ 급식 중량 규칙이 과대평가하고 있다 — servingWeight.js의 cafeteria 분기를 확인할 것.')

  const pass = violations.length === 0 && overshootOk
  console.log(`\n판정: 출처 선택 불변식 ${violations.length === 0 ? 'PASS' : 'FAIL'} · 급식 과대평가 ${overshootOk ? 'PASS' : 'FAIL'}`)
  process.exit(pass ? 0 : 1)
}

main()
