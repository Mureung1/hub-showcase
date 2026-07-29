import 'dotenv/config'
import { pool } from '../src/db/pool.js'
import { withTransaction } from '../src/db/withTransaction.js'
import * as notificationRepo from '../src/repositories/notificationRepository.js'

/*
 * 알림 대상 판정 시나리오 측정 (최적화.md §6 — bbox 전후 비교용).
 *
 * 가게로부터 거리가 서로 다른 소비자 N명을 배치하고, 딜 등록 시 알림 판정이
 *   1) 올바른 사람만 고르는가 (정확성)
 *   2) 얼마나 걸리는가 (성능)
 * 를 함께 확인한다.
 *
 * 측정 지점이 중요하다. 딜 등록 API는 알림 판정을 await 하지 않으므로
 * (dealService.js — 응답을 막지 않기 위함) HTTP 응답 시간에는 판정 비용이 잡히지 않는다.
 * 따라서 findTargets를 직접 호출해 잰다.
 *
 * 기대값은 SQL과 독립적으로 JS에서 Haversine을 다시 계산해 교차 검증한다.
 * 같은 공식을 두 번 구현한 셈이라, 한쪽이 틀리면 불일치로 드러난다.
 *
 *   npm run measure:notify -w server -- --users=10 --runs=5
 *   npm run measure:notify -w server -- --clean
 */

const PREFIX = 'dist-user-'
const DEAL_NAME = '[측정] 알림 판정용 딜'
const CATEGORY = '베이커리'
const RADIUS_KM = 2.0

// 위도 1도 ≈ 111.32km. 자오선을 따라 북쪽으로 옮기면 원하는 거리를 정확히 만들 수 있다
const KM_PER_DEG_LAT = 111.32

// 구체(JS)와 타원체(PostGIS)의 차이는 한국 위도에서 약 0.15%다.
// 여유를 두어 반경의 1% 이내에 있는 점은 판정 유보로 처리한다(2km이면 ±20m).
const AMBIGUOUS_RATIO = 0.01

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (!hit) return fallback
  const v = Number(hit.split('=')[1])
  if (!Number.isFinite(v) || v <= 0) throw new Error(`--${name} 값이 올바르지 않습니다.`)
  return v
}

/*
 * 교차 검증용 거리 계산 (JS, 구체 Haversine).
 *
 * SQL은 PostGIS geography(WGS84 회전타원체)를 쓰므로 이 값과 정확히 같지 않다.
 * 한국 위도에서 차이는 약 0.15%다 — 2km 반경이면 약 3m.
 *
 * 그래도 JS로 따로 계산하는 이유는 "SQL이 맞는지"를 SQL과 무관한 수단으로 보기 위함이다.
 * 대신 경계에서 두 방식이 갈릴 수 있으므로, 경계 근처(AMBIGUOUS_RATIO)는
 * 판정 유보로 빼고 나머지만 엄격히 비교한다.
 */
function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371
  const r = (d) => (d * Math.PI) / 180
  return (
    R *
    Math.acos(
      Math.min(
        1,
        Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.cos(r(bLng) - r(aLng)) +
          Math.sin(r(aLat)) * Math.sin(r(bLat)),
      ),
    )
  )
}

async function clean(client) {
  await client.query(
    `DELETE FROM notifications WHERE deal_id IN (SELECT id FROM deals WHERE name = $1)`,
    [DEAL_NAME],
  )
  await client.query('DELETE FROM deals WHERE name = $1', [DEAL_NAME])
  await client.query(`DELETE FROM users WHERE email LIKE $1`, [`${PREFIX}%`])
}

async function setup(users) {
  return withTransaction(async (client) => {
    await clean(client)

    const { rows: stores } = await client.query(
      'SELECT id, name, lat, lng FROM stores ORDER BY id LIMIT 1',
    )
    if (stores.length === 0) throw new Error('가게가 없습니다. 먼저 npm run seed 를 실행하세요.')
    const store = stores[0]

    // 0.2km부터 4.0km까지 균등 배치 — 반경 2km를 걸치도록
    const placed = []
    for (let i = 1; i <= users; i++) {
      const km = 0.2 + ((4.0 - 0.2) * (i - 1)) / Math.max(1, users - 1)
      const lat = Number(store.lat) + km / KM_PER_DEG_LAT
      const lng = Number(store.lng)

      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, nickname, role,
                            base_address, base_lat, base_lng, noti_location_mode, noti_radius_km)
         VALUES ($1, 'measure-temp', $2, 'consumer', '측정용', $3, $4, 'radius', $5)
         RETURNING id`,
        [`${PREFIX}${i}@hub.test`, `거리${km.toFixed(1)}km`, lat, lng, RADIUS_KM],
      )
      const userId = Number(rows[0].id)
      await client.query(
        'INSERT INTO user_interest_categories (user_id, category) VALUES ($1, $2)',
        [userId, CATEGORY],
      )

      placed.push({
        userId,
        km: haversineKm(Number(store.lat), Number(store.lng), lat, lng),
      })
    }

    const { rows: dealRows } = await client.query(
      `INSERT INTO deals (store_id, name, category, original_price, sale_price,
                          total_qty, remaining_qty, pickup_deadline_at, status)
       VALUES ($1, $2, $3, 4000, 2000, 10, 10, now() + make_interval(hours => 3), 'active')
       RETURNING id`,
      [store.id, DEAL_NAME, CATEGORY],
    )

    return { store, dealId: Number(dealRows[0].id), placed }
  })
}

async function main() {
  if (process.argv.includes('--clean')) {
    await withTransaction(clean)
    console.log('측정용 데이터 삭제 완료')
    return
  }

  const users = arg('users', 10)
  const runs = arg('runs', 5)

  const { store, dealId, placed } = await setup(users)
  await pool.query('ANALYZE users, user_interest_categories')

  console.log(`가게: ${store.name} (${store.lat}, ${store.lng})`)
  console.log(
    `소비자 ${users}명 배치 · 각자 반경 설정 ${RADIUS_KM}km · 관심 카테고리 ${CATEGORY}\n`,
  )

  // 기대값: JS에서 독립 계산. 경계 ±1%는 계산 방식 차이로 갈릴 수 있어 유보한다.
  const band = RADIUS_KM * AMBIGUOUS_RATIO
  const isAmbiguous = (p) => Math.abs(p.km - RADIUS_KM) <= band
  const decided = placed.filter((p) => !isAmbiguous(p))
  const ambiguous = placed.filter(isAmbiguous)
  const expected = decided.filter((p) => p.km < RADIUS_KM).map((p) => p.userId)

  if (users <= 20) {
    console.log('배치된 소비자')
    for (const p of placed) {
      const mark = isAmbiguous(p) ? '판정 유보' : p.km < RADIUS_KM ? '반경 안' : '반경 밖'
      console.log(`  #${p.userId}  ${p.km.toFixed(2).padStart(5)} km  ${mark}`)
    }
  } else {
    console.log(`배치: ${users}명 (0.2~4.0km 균등) — 목록 출력은 20명 이하일 때만`)
  }

  // 측정: findTargets 반복 호출
  const times = []
  let targets = []
  for (let i = 0; i < runs; i++) {
    const t0 = process.hrtime.bigint()
    targets = await notificationRepo.findTargets(dealId)
    times.push(Number(process.hrtime.bigint() - t0) / 1e6)
  }
  times.sort((a, b) => a - b)

  // 시딩 소비자(consumer1 등)도 조건에 맞으면 포함되므로, 측정용 사용자만 비교한다
  const placedIds = new Set(placed.map((p) => p.userId))
  const ambiguousIds = new Set(ambiguous.map((p) => p.userId))
  const actual = targets.map((t) => Number(t.userId)).filter((id) => placedIds.has(id))
  const actualDecided = actual.filter((id) => !ambiguousIds.has(id))

  const missing = expected.filter((id) => !actualDecided.includes(id))
  const extra = actualDecided.filter((id) => !expected.includes(id))
  const ok = missing.length === 0 && extra.length === 0

  const fmt = (a) => (a.length ? a.slice(0, 10).join(', ') + (a.length > 10 ? ' …' : '') : '없음')

  console.log(`\n판정 결과`)
  console.log(`  전체 대상      : ${targets.length}명 (시딩 사용자 포함)`)
  console.log(`  측정용 중 대상 : ${actual.length}명`)
  console.log(`  기대           : ${expected.length}명 (반경 ${RADIUS_KM}km 이내, 경계 유보 제외)`)
  console.log(`  판정 유보      : ${ambiguous.length}명 (경계 ±${(band * 1000).toFixed(0)}m)`)
  console.log(`  누락           : ${fmt(missing)}`)
  console.log(`  과다           : ${fmt(extra)}`)
  console.log(`  정확성         : ${ok ? '일치 (SQL=PostGIS, 기대=JS 독립 계산)' : '불일치'}`)

  console.log(`\n소요 시간 (findTargets, ${runs}회)`)
  console.log(`  중앙값 : ${times[Math.floor(times.length / 2)].toFixed(2)} ms`)
  console.log(`  최소   : ${times[0].toFixed(2)} ms`)
  console.log(`  최대   : ${times[times.length - 1].toFixed(2)} ms`)

  if (!ok) process.exitCode = 1
}

main()
  .catch((err) => {
    console.error('측정 실패:', err.message || err.code || '')
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
