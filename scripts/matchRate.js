// 6주차 §0 — foodLookup의 실전 매칭률 리포트.
//
//   node scripts/matchRate.js
//
// server/data/univ-meals.json(대학 학식 크롤링 데이터)과 server/data/neisMealSamples.json(NEIS
// 급식 실제 응답에서 뽑은 초·중·고 샘플 — server/nutrition/precisionEngine.accuracy.test.js와
// 같은 데이터를 재사용해 데이터셋이 둘로 갈라지지 않게 한다)의 메뉴명을 전부 모아 lookupFood 매칭률을
// 잰다. 목표 80%. 미달이면 미매칭 상위 메뉴를 보고 foodDB/별칭을 보강한 뒤 다시 돌린다.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lookupFood } from '../server/nutrition/foodLookup.js'
import { resolveFoodItems } from '../server/nutrition/resolveFood.js'
import { FOOD_MATCH_SIMILARITY_THRESHOLD, foodNameSimilarity } from '../src/lib/foodMatch.js'
import { classifyMenuRole } from '../src/lib/mealPortions.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'server', 'data')

// 매칭 실패는 곧 "Gemini 추정이 채울 열량"이다(실측: 급식 공식 열량의 약 48%). 그래서 이 지표는
// 유료 NEIS 벤치마크의 통과 개수보다 훨씬 안정적인 개선 신호다. 80%는 원재료성 식품이 식약처 API에
// 아예 없다는 구조적 한계 때문에 도달 불가로 확인됐고(6주차 §0), 60%를 현실적인 회귀 방지선으로 둔다.
const TARGET_RATE = 60

function collectUnivMenuNames() {
  const data = JSON.parse(readFileSync(path.join(DATA_DIR, 'univ-meals.json'), 'utf8'))
  const names = new Set()
  const walk = (node) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (node && typeof node === 'object') {
      if (Array.isArray(node.menus)) {
        for (const m of node.menus) {
          const name = typeof m === 'string' ? m : m?.name
          if (name) names.add(name)
        }
      }
      Object.values(node).forEach(walk)
    }
  }
  walk(data)
  return names
}

function collectNeisMenuNames() {
  const samples = JSON.parse(readFileSync(path.join(DATA_DIR, 'neisMealSamples.json'), 'utf8'))
  const names = new Set()
  for (const sample of samples) {
    for (const name of sample.menus ?? []) names.add(name)
  }
  return names
}

// 실측 결과(6주차 §0): 전체 매칭률은 밑반찬·후식·음료 롱테일(창작 조합 메뉴명, 원재료성 과일·유제품 —
// 식약처 API 두 종("음식"/"가공식품") 어디에도 없는 원재료 DB 영역) 때문에 80%에 못 미친다. 반면
// 칼로리 비중이 큰 밥·국·면은 이미 88%+로, precisionEngine(6주차 §1)의 실측 정확도(총 kcal 오차)에
// 훨씬 직접적인 영향을 준다. 그래서 전체 수치 옆에 role별 분포를 항상 같이 낸다 — 숫자 하나로
// "부족하다"고 오독하지 않도록.
// 예전 구조 재현 — 매처가 준 **단 하나의 답**에 게이트를 건다. 그 하나가 틀리면 더 나은 후보로
// 바꿀 방법이 없어서, 게이트를 엄격하게 할수록 매칭률이 떨어지는 구조였다.
function singleMatcherHit(name) {
  const result = lookupFood(name)
  if (!result) return false
  if (result.matchType === 'exact' || result.matchType === 'alias') return true
  return foodNameSimilarity(name, result.item.name) >= FOOD_MATCH_SIMILARITY_THRESHOLD
}

async function main() {
  const allNames = [...new Set([...collectUnivMenuNames(), ...collectNeisMenuNames()])]

  // ① 예전 방식(단일 매처) ② 지금(자모 역색인으로 넓게 회수 → 게이트가 최선 선택).
  // 원격(searchRemote)은 주지 않는다 — 과금·네트워크 없이 재현 가능해야 하는 지표다.
  const singleHits = allNames.filter(singleMatcherHit).length
  const startedAt = Date.now()
  const resolved = await resolveFoodItems(allNames.map((name) => ({ dbSearchName: name })))
  const elapsed = Date.now() - startedAt
  const matchedCount = resolved.filter((r) => r.match).length
  const rate = (matchedCount / allNames.length) * 100

  console.log(`전체 메뉴명: ${allNames.length}개 (univ-meals + neisMealSamples, 중복 제거)`)
  console.log(`  단일 매처 + 게이트   ${String(singleHits).padStart(4)}개  ${((singleHits / allNames.length) * 100).toFixed(1)}%`)
  console.log(
    `  retrieval + 게이트   ${String(matchedCount).padStart(4)}개  ${rate.toFixed(1)}%   (${matchedCount - singleHits >= 0 ? '+' : ''}${matchedCount - singleHits})`,
  )
  console.log(`  로컬 해석 속도       ${elapsed}ms / ${allNames.length}건 = ${(elapsed / allNames.length).toFixed(1)}ms per item`)

  const byType = {}
  const byRole = {}
  const unmatched = []
  for (const [i, name] of allNames.entries()) {
    const role = classifyMenuRole(name).role
    byRole[role] ??= { matched: 0, total: 0 }
    byRole[role].total += 1
    if (!resolved[i].match) {
      unmatched.push(name)
      continue
    }
    byType[resolved[i].matchType] = (byType[resolved[i].matchType] ?? 0) + 1
    byRole[role].matched += 1
  }

  console.log('\nmatchType별 분포:', byType)
  console.log('\nrole별 매칭률(칼로리 비중이 큰 밥/국/면이 실제 정확도에 가장 직접적):')
  for (const [role, { matched, total }] of Object.entries(byRole).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`  ${role.padEnd(8)} ${matched}/${total} (${((matched / total) * 100).toFixed(1)}%)`)
  }

  console.log(`\n미매칭 ${unmatched.length}개 — 이 항목들의 열량은 전부 Gemini 추정이 채운다:`)
  console.log(`  ${unmatched.sort((a, b) => a.localeCompare(b, 'ko')).slice(0, 40).join(', ')}${unmatched.length > 40 ? ' …' : ''}`)

  console.log(`\n목표 ${TARGET_RATE}%: ${rate >= TARGET_RATE ? '통과' : '미달'}`)
  if (rate < TARGET_RATE) {
    console.log(
      '남은 미달분은 대부분 원재료성 식품(과일·우유)과 창작 조합 메뉴명이다 — 식약처 두 API 어디에도 ' +
        '없는 영역이라 매칭 규칙으로는 못 메운다. 유사도 허용치를 풀어 숫자를 맞추지 말 것(오매칭 위험).',
    )
  }
  process.exit(rate >= TARGET_RATE ? 0 : 1)
}

main()
