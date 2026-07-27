import 'dotenv/config'
import { pool } from './pool.js'
import { withTransaction } from './withTransaction.js'

/*
 * 위치 쿼리 측정용 대용량 시딩 (최적화.md §6).
 *
 * 데모 시딩을 지우지 않고 `geo-` 접두사 데이터만 얹었다 지운다(멱등).
 * 좌표는 난수가 아니라 인덱스의 결정적 함수라, 재실행해도 같은 분포가 나온다(측정 재현성).
 *
 *   npm run seed:geo -w server -- --stores=10000 --users=100000
 *   npm run seed:geo -w server -- --clean
 *
 * 가게 1곳당 소유자 1명이 필요하다(stores.owner_id NOT NULL UNIQUE).
 */

const PASSWORD_HASH = 'seed-password-hash(temp)'
const CATEGORIES = ['베이커리', '디저트', '신선식품', '반찬', '음료']

// 대한민국 대략 범위 — 반경 필터가 의미를 갖도록 전국에 흩뿌린다
const LAT_MIN = 33.2
const LAT_SPAN = 5.3
const LNG_MIN = 126.1
const LNG_SPAN = 3.4

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (!hit) return fallback
  const value = Number(hit.split('=')[1])
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} 은 1 이상의 정수여야 합니다.`)
  }
  return value
}

async function clean(client) {
  // FK 순서대로: 예약·알림 → 딜 → 즐겨찾기·관심 → 가게 → 유저
  await client.query(`DELETE FROM reservations WHERE deal_id IN (
     SELECT d.id FROM deals d JOIN stores s ON s.id = d.store_id WHERE s.name LIKE 'geo-store-%')`)
  await client.query(`DELETE FROM notifications WHERE deal_id IN (
     SELECT d.id FROM deals d JOIN stores s ON s.id = d.store_id WHERE s.name LIKE 'geo-store-%')`)
  await client.query(`DELETE FROM deals WHERE store_id IN (
     SELECT id FROM stores WHERE name LIKE 'geo-store-%')`)
  await client.query(`DELETE FROM favorites WHERE store_id IN (
     SELECT id FROM stores WHERE name LIKE 'geo-store-%')`)
  await client.query(`DELETE FROM stores WHERE name LIKE 'geo-store-%'`)
  await client.query(`DELETE FROM users WHERE email LIKE 'geo-%@hub.test'`)
}

async function seedGeo() {
  const wantsClean = process.argv.includes('--clean')
  const stores = arg('stores', 10000)
  const users = arg('users', 100000)

  const counts = await withTransaction(async (client) => {
    await clean(client)
    if (wantsClean) return null

    // 좌표: 서로 다른 소수를 곱해 위/경도가 같이 움직이지 않게 한다
    const lat = (i) => `${LAT_MIN} + ((${i} * 7919) % 100000) / 100000.0 * ${LAT_SPAN}`
    const lng = (i) => `${LNG_MIN} + ((${i} * 6271) % 100000) / 100000.0 * ${LNG_SPAN}`
    const cat = (i) => `(ARRAY['${CATEGORIES.join("','")}'])[1 + (${i} % 5)]`

    // 1) 가게 주인 (가게당 1명)
    await client.query(
      `INSERT INTO users (email, password_hash, nickname, role)
       SELECT 'geo-owner-' || g || '@hub.test', $1, 'geo사장' || g, 'owner'
       FROM generate_series(1, $2) g`,
      [PASSWORD_HASH, stores],
    )

    // 2) 가게
    await client.query(
      `INSERT INTO stores (owner_id, name, category, address, lat, lng)
       SELECT u.id, 'geo-store-' || g, ${cat('g')}, 'geo-addr-' || g,
              ${lat('g')}, ${lng('g')}
       FROM generate_series(1, $1) g
       JOIN users u ON u.email = 'geo-owner-' || g || '@hub.test'`,
      [stores],
    )

    // 3) 가게당 활성 딜 1개 (findNearby의 대상)
    await client.query(
      `INSERT INTO deals (store_id, name, category, original_price, sale_price,
                          total_qty, remaining_qty, pickup_deadline_at, status)
       SELECT s.id, 'geo-deal-' || s.id, s.category, 10000, 5000, 10, 10,
              now() + make_interval(hours => 6), 'active'
       FROM stores s WHERE s.name LIKE 'geo-store-%'`,
    )

    // 4) 소비자 — 절반은 radius(2km), 절반은 always
    await client.query(
      `INSERT INTO users (email, password_hash, nickname, role,
                          base_address, base_lat, base_lng, noti_location_mode, noti_radius_km)
       SELECT 'geo-user-' || g || '@hub.test', $1, 'geo소비자' || g, 'consumer',
              'geo-addr-' || g, ${lat('g')}, ${lng('g')},
              CASE WHEN g % 2 = 0 THEN 'always' ELSE 'radius' END, 2.0
       FROM generate_series(1, $2) g`,
      [PASSWORD_HASH, users],
    )

    // 5) 관심 카테고리 — findTargets가 후보를 갖도록 소비자당 1개
    await client.query(
      `INSERT INTO user_interest_categories (user_id, category)
       SELECT u.id, ${cat('g')}
       FROM generate_series(1, $1) g
       JOIN users u ON u.email = 'geo-user-' || g || '@hub.test'
       ON CONFLICT DO NOTHING`,
      [users],
    )

    const { rows } = await client.query(`
      SELECT
        (SELECT count(*)::int FROM stores) AS stores,
        (SELECT count(*)::int FROM deals WHERE status = 'active') AS active_deals,
        (SELECT count(*)::int FROM users WHERE role = 'consumer') AS consumers
    `)
    return rows[0]
  })

  if (wantsClean) {
    console.log('geo 데이터 삭제 완료')
    return
  }

  // 측정 전 통계 갱신 — 플래너가 낡은 통계로 잘못된 계획을 세우지 않도록
  await pool.query('ANALYZE users, stores, deals, user_interest_categories')
  console.log('geo 시딩 완료:', counts)
}

seedGeo()
  .catch((err) => {
    console.error('geo 시딩 실패:', err.message || err.code || '')
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
