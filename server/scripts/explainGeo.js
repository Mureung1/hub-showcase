import 'dotenv/config'
import { pool } from '../src/db/pool.js'
import { FIND_NEARBY_SQL } from '../src/repositories/dealRepository.js'
import { FIND_TARGETS_SQL } from '../src/repositories/notificationRepository.js'

/*
 * 위치 쿼리 실행 계획·소요 측정 (최적화.md §6).
 *
 * 저장소가 내보낸 쿼리 상수를 그대로 import해 EXPLAIN 한다.
 * 쿼리를 여기에 복붙하면 저장소가 바뀔 때 조용히 어긋나므로 정의는 한 곳에만 둔다.
 *
 *   npm run explain:geo -w server
 *   npm run explain:geo -w server -- --radius=2 --runs=5
 */

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (!hit) return fallback
  const v = Number(hit.split('=')[1])
  return Number.isFinite(v) && v > 0 ? v : fallback
}

// 네이버 1784 기준 (데모 시딩의 소비자 기준 주소와 동일)
const BASE_LAT = 37.3595
const BASE_LNG = 127.1052

async function measure(label, sql, params, runs) {
  const times = []
  let plan = ''

  for (let i = 0; i < runs; i++) {
    const { rows } = await pool.query(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`, params)
    const text = rows.map((r) => r['QUERY PLAN']).join('\n')
    if (i === 0) plan = text
    const m = text.match(/Execution Time: ([\d.]+) ms/)
    if (m) times.push(Number(m[1]))
  }

  times.sort((a, b) => a - b)
  const median = times[Math.floor(times.length / 2)]

  // 판단 근거가 되는 줄만 추린다
  const scans = plan
    .split('\n')
    .filter((l) => /Seq Scan|Index Scan|Index Only Scan|Bitmap|Nested Loop|Hash Join|Sort/.test(l))
    .map((l) => l.trim())

  console.log(`\n${'='.repeat(70)}\n${label}\n${'='.repeat(70)}`)
  console.log(`소요(중앙값): ${median} ms   전체: [${times.join(', ')}]`)
  console.log(`\n주요 노드:`)
  scans.forEach((l) => console.log(`  ${l}`))
  console.log(`\n전체 계획:\n${plan}`)
  return { label, median, times, usesSeqScan: /Seq Scan/.test(plan) }
}

async function main() {
  const radius = arg('radius', 2)
  const runs = arg('runs', 5)

  const { rows: stat } = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM stores) AS stores,
      (SELECT count(*)::int FROM deals WHERE status = 'active') AS active_deals,
      (SELECT count(*)::int FROM users WHERE role = 'consumer') AS consumers
  `)
  console.log('데이터 규모:', stat[0])
  console.log(`기준 좌표: (${BASE_LAT}, ${BASE_LNG})  반경: ${radius}km  반복: ${runs}회`)

  // findTargets 대상 딜 — geo 데이터가 있으면 그중 하나
  const { rows: dealRows } = await pool.query(
    `SELECT d.id FROM deals d JOIN stores s ON s.id = d.store_id
     WHERE s.name LIKE 'geo-store-%' ORDER BY d.id LIMIT 1`,
  )
  const dealId = dealRows[0]?.id
  if (!dealId) throw new Error('geo 딜이 없습니다. 먼저 seed:geo 를 실행하세요.')

  const results = []
  results.push(
    await measure(
      'findNearby — 반경 내 활성 딜 조회',
      FIND_NEARBY_SQL,
      [BASE_LAT, BASE_LNG, radius],
      runs,
    ),
  )
  results.push(await measure('findTargets — 알림 대상 판정', FIND_TARGETS_SQL, [dealId], runs))

  console.log(`\n${'='.repeat(70)}\n요약\n${'='.repeat(70)}`)
  for (const r of results) {
    console.log(
      `${r.label.padEnd(40)} ${String(r.median).padStart(9)} ms   Seq Scan: ${r.usesSeqScan ? 'YES' : 'no'}`,
    )
  }
}

main()
  .catch((err) => {
    console.error('측정 실패:', err.message || err.code || '')
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
