// CSV 가져오기 성능/정확도 테스트용 샘플 파일 생성기(PRD v2.0 수용 기준: "1,000행 기준 가져오기 3초 이내").
//
// 사용법:
//   node scripts/generate-sample-csv.mjs                    # 1000행, scripts/sample-1000.csv
//   node scripts/generate-sample-csv.mjs 5000 out.csv       # 행 수/경로 지정
//   node scripts/generate-sample-csv.mjs 1000 broken.csv --broken   # 일부러 깨진 행을 섞음
//
// --broken 옵션은 "행 단위 파싱 실패는 건너뛰고 결과 요약(N건 가져옴, M건 실패)" 동작을 확인하는 용도로,
// 열 개수 부족 / 날짜 형식 오류 / 이름 누락 / 숫자 아닌 영양소 4가지를 20행마다 하나씩 끼워 넣는다.
//
// 만들어진 파일은 앱의 MY 탭 > "데이터 가져오기(CSV)"로 그대로 올리면 된다.
// 형식은 src/lib/dataBackup.js와 정확히 같아야 하므로, 그 파일의 컬럼 정의를 바꾸면 여기도 함께 고칠 것.

import { writeFileSync } from 'node:fs'

const NUTRIENT_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium']
const MEAL_COLUMNS = ['date', 'mealType', 'item_name', 'brand', 'source', ...NUTRIENT_KEYS]
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'etc']
const FOODS = [
  '비빔밥', '김치찌개', '된장찌개', '제육볶음', '불고기', '삼겹살', '치킨', '짜장면',
  '짬뽕', '라면', '칼국수', '냉면', '떡볶이', '김밥', '순대', '만두', '돈까스', '카레',
  '볶음밥', '갈비탕', '설렁탕', '감자탕', '해장국', '순두부찌개', '부대찌개', '쌀밥',
]
const SOURCES = ['식약처DB', '식약처DB(가공)', '추정']

const rowCount = Number(process.argv[2]) || 1000
const outPath = process.argv[3] || 'scripts/sample-1000.csv'
const withBroken = process.argv.includes('--broken')

// 재현 가능한 의사난수(같은 인자면 항상 같은 파일이 나오게 — 테스트 비교가 가능해야 한다).
let seed = 20260722
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 2147483648
}
function pick(list) {
  return list[Math.floor(rand() * list.length)]
}
function int(min, max) {
  return Math.floor(min + rand() * (max - min + 1))
}

function escapeField(value) {
  const str = value === null || value === undefined ? '' : String(value)
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

// 오늘부터 과거로 하루씩 거슬러 올라가며 날짜를 채운다(하루에 3~5행).
function buildRows() {
  const rows = []
  const start = new Date(2026, 6, 22) // 2026-07-22 (로컬 기준, UTC 변환으로 하루 밀리지 않게 직접 구성)
  let dayOffset = 0
  let brokenCount = 0

  while (rows.length < rowCount) {
    const d = new Date(start)
    d.setDate(d.getDate() - dayOffset)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const perDay = int(3, 5)
    for (let i = 0; i < perDay && rows.length < rowCount; i++) {
      const normal = [
        date,
        pick(MEAL_TYPES),
        pick(FOODS),
        '',
        pick(SOURCES),
        int(200, 900), // calories
        int(5, 45), // protein
        int(20, 130), // carbs
        int(3, 40), // fat
        int(1, 12), // fiber
        int(300, 2500), // sodium
      ]

      if (withBroken && rows.length % 20 === 19) {
        brokenCount += 1
        switch (brokenCount % 4) {
          case 1: // 열 개수 부족
            rows.push(normal.slice(0, 5))
            break
          case 2: // 날짜 형식 오류
            rows.push(['2026/07/22', ...normal.slice(1)])
            break
          case 3: // 음식 이름 누락
            rows.push([normal[0], normal[1], '', ...normal.slice(3)])
            break
          default: // 숫자가 아닌 영양소
            rows.push([...normal.slice(0, 5), 'N/A', ...normal.slice(6)])
        }
        continue
      }

      rows.push(normal)
    }
    dayOffset += 1
  }

  return { rows, brokenCount }
}

const { rows, brokenCount } = buildRows()

const text = [
  '# Mealyze 데이터 백업(기기 이동용) — scripts/generate-sample-csv.mjs로 생성한 테스트 파일',
  `# rows=${rowCount} broken=${withBroken ? brokenCount : 0}`,
  '',
  '[profile]',
  'key,value',
  'age,30',
  'sex,male',
  'heightCm,175',
  'weightKg,70',
  'activity,moderate',
  'conditions,',
  'allergies,',
  '',
  '[meals]',
  MEAL_COLUMNS.join(','),
  ...rows.map((row) => row.map(escapeField).join(',')),
].join('\r\n')

// 엑셀 한글 깨짐 방지를 위해 앱이 내보내는 파일과 동일하게 UTF-8 BOM을 붙인다.
writeFileSync(outPath, '﻿' + text, 'utf8')

console.log(`생성 완료: ${outPath}`)
console.log(`  식단 행: ${rows.length}행 (그중 의도적으로 깨뜨린 행: ${withBroken ? brokenCount : 0}행)`)
console.log(`  날짜 수: ${new Set(rows.map((r) => r[0])).size}일`)
console.log('  앱의 MY 탭 > "데이터 가져오기(CSV)"에 그대로 올려 확인하세요.')
