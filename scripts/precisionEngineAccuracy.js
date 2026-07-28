// 6주차 §1-A — precisionEngine 실측 정확도 리포트.
//
//   node scripts/precisionEngineAccuracy.js
//
// 실제 OpenRouter(Gemini)를 호출한다(유료) — 그래서 npm test가 아니라 별도 스크립트다. matchRate.js와
// 같은 이유: 매 테스트 실행마다 과금·네트워크 의존이 생기는 건 CI에 맞지 않는다(server/nutrition/
// precisionEngine.test.js가 목으로 하는 빠른 로직 검증을 담당).
//
// server/data/neisMealSamples.json(실제 NEIS 응답, 초·중·고 3개교 1개월치)에서 초·중·고 섞어 20개를
// 뽑아 calibrate:false(캘리브레이션 끈 원본 파이프라인)로 계산한 총 kcal을 NEIS 공식 kcal과 비교한다.
// 기준: 20개 중 16개 이상 오차 ≤20%.
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeTray } from '../server/nutrition/precisionEngine.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SAMPLES_PATH = path.join(__dirname, '..', 'server', 'data', 'neisMealSamples.json')

const ERROR_THRESHOLD_PCT = 20
const PASS_TARGET = 16
const SAMPLE_COUNT = 20

const MEAL_TYPE_MAP = { 조식: 'breakfast', 중식: 'lunch', 석식: 'dinner' }

function pickSamples() {
  const all = JSON.parse(readFileSync(SAMPLES_PATH, 'utf8')).filter((s) => s.officialCalories > 0 && s.menus.length > 0)
  const byType = { elementary: [], middle: [], high: [] }
  for (const s of all) byType[s.schoolType]?.push(s)

  // 초·중·고 섞어서 20개(가이드 명시) — 초 7 + 중 7 + 고 6, 부족하면 있는 만큼만.
  const picked = [...byType.elementary.slice(0, 7), ...byType.middle.slice(0, 7), ...byType.high.slice(0, 6)]
  return picked.slice(0, SAMPLE_COUNT)
}

async function main() {
  const samples = pickSamples()
  console.log(`샘플 ${samples.length}개(초 ${samples.filter((s) => s.schoolType === 'elementary').length} / 중 ${
    samples.filter((s) => s.schoolType === 'middle').length
  } / 고 ${samples.filter((s) => s.schoolType === 'high').length})\n`)

  const rows = []
  for (const sample of samples) {
    const mealType = MEAL_TYPE_MAP[sample.mealType] ?? 'lunch'
    const result = await analyzeTray(
      { menus: sample.menus, mealType, schoolType: sample.schoolType, officialTotals: null },
      { calibrate: false, useCache: false },
    )
    const computed = result.total.calories
    const errorPct = (Math.abs(computed - sample.officialCalories) / sample.officialCalories) * 100
    rows.push({
      school: sample.school,
      schoolType: sample.schoolType,
      date: sample.date,
      mealType: sample.mealType,
      official: sample.officialCalories,
      computed,
      errorPct,
      pass: errorPct <= ERROR_THRESHOLD_PCT,
      items: result.items,
    })
  }

  console.log('학교          유형    날짜      끼니  공식kcal  계산kcal  오차%   판정')
  for (const r of rows) {
    console.log(
      `${r.school.padEnd(12)} ${r.schoolType.padEnd(10)} ${r.date}  ${r.mealType}  ` +
        `${String(r.official).padStart(7)}  ${String(r.computed).padStart(7)}  ${r.errorPct.toFixed(1).padStart(5)}%  ${
          r.pass ? '통과' : '미달'
        }`,
    )
  }

  const passCount = rows.filter((r) => r.pass).length
  const avgError = rows.reduce((s, r) => s + r.errorPct, 0) / rows.length

  console.log(`\n통과: ${passCount}/${rows.length} (목표 ${PASS_TARGET}/${SAMPLE_COUNT})`)
  console.log(`평균 오차: ${avgError.toFixed(1)}%`)

  const worst = [...rows].sort((a, b) => b.errorPct - a.errorPct).slice(0, 3)
  console.log('\n최악 3개 상세:')
  for (const r of worst) {
    console.log(`\n- ${r.school} ${r.date} ${r.mealType} (오차 ${r.errorPct.toFixed(1)}%, 공식 ${r.official}kcal → 계산 ${r.computed}kcal)`)
    for (const item of r.items) {
      console.log(`    ${item.matched ? `[${item.matchType}]` : '[gemini]'} ${item.name} ${item.weight}g → ${item.nutrients.calories}kcal`)
    }
  }

  console.log(`\n목표 ${PASS_TARGET}/${SAMPLE_COUNT}: ${passCount >= PASS_TARGET ? '통과' : '미달'}`)
  if (passCount < PASS_TARGET) process.exitCode = 1
}

main().catch((err) => {
  console.error('precisionEngineAccuracy 실패:', err)
  process.exit(1)
})
