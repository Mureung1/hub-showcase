import 'dotenv/config'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../src/db/pool.js'
import { withTransaction } from '../src/db/withTransaction.js'
import { printTarget } from './targetInfo.js'

/*
 * 부하 테스트 픽스처 (T-15).
 *
 * 데모 시딩(seed.js)을 지우지 않고 그 위에 전용 딜 1개와 소비자 N명을 얹는다.
 * 매 실행마다 전용 딜의 예약을 지우고 재고를 되돌리므로, k6 실행 사이에 반복 호출하면 된다(멱등).
 *
 *   npm run seed:load -w server -- --stock=5 --users=50
 *
 * 실제 생성된 user id를 load/fixture.json 으로 내보낸다. k6는 이 파일을 읽어 요청 주체를 정한다.
 * (ON CONFLICT DO NOTHING 도 시퀀스를 소모하므로 id가 연속이라고 가정하면 안 된다.)
 */

const LOAD_DEAL_NAME = '[부하테스트] 선착순 상품'
const LOAD_EMAIL_PREFIX = 'load-user-'
const PASSWORD_HASH = 'seed-password-hash(temp)'

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (!hit) return fallback
  const value = Number(hit.split('=')[1])
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} 은 1 이상의 정수여야 합니다.`)
  }
  return value
}

async function seedLoad() {
  printTarget()

  const stock = arg('stock', 5)
  const users = arg('users', 50)

  const result = await withTransaction(async (client) => {
    // 기준 가게 — 데모 시딩이 먼저 실행돼 있어야 한다
    const { rows: stores } = await client.query('SELECT id FROM stores ORDER BY id LIMIT 1')
    if (stores.length === 0) {
      throw new Error('가게가 없습니다. 먼저 `npm run seed -w server` 를 실행하세요.')
    }
    const storeId = stores[0].id

    // 소비자 N명 확보 (이미 있으면 그대로 둔다)
    for (let i = 1; i <= users; i++) {
      await client.query(
        `INSERT INTO users (email, password_hash, nickname, role,
                            base_address, base_lat, base_lng, noti_location_mode, noti_radius_km)
         VALUES ($1, $2, $3, 'consumer', '경기 성남시 분당구 정자일로 95', 37.3595, 127.1052, 'radius', 2.0)
         ON CONFLICT (email) DO NOTHING`,
        [`${LOAD_EMAIL_PREFIX}${i}@hub.test`, PASSWORD_HASH, `부하${i}`],
      )
    }
    const { rows: userRows } = await client.query(
      `SELECT id FROM users WHERE email LIKE $1 ORDER BY id LIMIT $2`,
      [`${LOAD_EMAIL_PREFIX}%`, users],
    )

    // 전용 딜 — 있으면 재고만 되돌리고, 없으면 만든다
    const { rows: existing } = await client.query(
      'SELECT id FROM deals WHERE name = $1 AND store_id = $2',
      [LOAD_DEAL_NAME, storeId],
    )

    let dealId
    if (existing.length > 0) {
      dealId = existing[0].id
      // 이전 회차의 예약을 지워야 불변식 검증이 이번 회차만 반영한다
      await client.query('DELETE FROM reservations WHERE deal_id = $1', [dealId])
      await client.query(
        `UPDATE deals
         SET total_qty = $2, remaining_qty = $2, status = 'active',
             pickup_deadline_at = now() + make_interval(hours => 6)
         WHERE id = $1`,
        [dealId, stock],
      )
    } else {
      const { rows } = await client.query(
        `INSERT INTO deals (store_id, name, category, original_price, sale_price,
                            total_qty, remaining_qty, pickup_deadline_at)
         VALUES ($1, $2, '베이커리', 10000, 5000, $3, $3, now() + make_interval(hours => 6))
         RETURNING id`,
        [storeId, LOAD_DEAL_NAME, stock],
      )
      dealId = rows[0].id
    }

    return { dealId: Number(dealId), stock, userIds: userRows.map((r) => Number(r.id)) }
  })

  // k6가 init 컨텍스트에서 open()으로 읽는다 (레포 루트 기준 load/fixture.json)
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), '../../load/fixture.json')
  mkdirSync(dirname(fixturePath), { recursive: true })
  writeFileSync(fixturePath, JSON.stringify(result, null, 2))

  console.log(
    `부하 픽스처 준비 완료 — dealId=${result.dealId} 재고=${result.stock} 유저=${result.userIds.length}명`,
  )
  console.log(`픽스처 기록: ${fixturePath}`)
}

seedLoad()
  .catch((err) => {
    // message가 비어 있는 오류(예: DB 연결 거부)가 있어 전체를 찍는다
    console.error('부하 픽스처 실패:', err.message || err.code || '')
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
