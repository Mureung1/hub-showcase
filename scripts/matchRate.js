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
import { classifyMenuRole } from '../src/lib/mealPortions.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'server', 'data')

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
function main() {
  const allNames = new Set([...collectUnivMenuNames(), ...collectNeisMenuNames()])

  const byType = { exact: 0, alias: 0, partial: 0, fuzzy: 0 }
  const byRole = {}
  const unmatched = []

  for (const name of allNames) {
    const result = lookupFood(name)
    const role = classifyMenuRole(name).role
    byRole[role] ??= { matched: 0, total: 0 }
    byRole[role].total += 1

    if (!result) {
      unmatched.push(name)
      continue
    }
    byType[result.matchType] += 1
    byRole[role].matched += 1
  }

  const matchedCount = allNames.size - unmatched.length
  const rate = allNames.size > 0 ? (matchedCount / allNames.size) * 100 : 0

  console.log(`전체 메뉴명: ${allNames.size}개`)
  console.log(`매칭: ${matchedCount}개 (${rate.toFixed(1)}%)`)
  console.log('matchType별 분포:', byType)

  console.log('\nrole별 매칭률(칼로리 비중이 큰 밥/국/면이 실제 정확도에 가장 직접적):')
  for (const [role, { matched, total }] of Object.entries(byRole).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`  ${role.padEnd(8)} ${matched}/${total} (${((matched / total) * 100).toFixed(1)}%)`)
  }

  console.log(`\n미매칭 ${unmatched.length}개:`)
  for (const name of unmatched.sort((a, b) => a.localeCompare(b, 'ko'))) console.log(`  - ${name}`)

  console.log(`\n목표 80%: ${rate >= 80 ? '통과' : '미달'}`)
  if (rate < 80) {
    console.log(
      '미달 사유(6주차 §0 실측 확인): 원재료성 식품(과일·우유 등)은 식약처 두 API 어디에도 없고, ' +
        '프랜차이즈 출처(15,225건) 추가 수집도 매칭률에 영향 없음 — 구조적 한계로 판단, fuzzy 매칭 ' +
        '허용치를 더 풀어 숫자를 맞추는 대신(오매칭 위험) 있는 그대로 기록한다.',
    )
  }
}

main()
