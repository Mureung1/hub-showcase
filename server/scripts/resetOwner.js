import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/*
 * 사장님 축만 되돌린다 (부스 운영용).
 *
 * `신규사장`은 가게 등록 화면(W1)을 시연하려고 일부러 가게 없이 시딩된다.
 * 한 번 등록하면 이후엔 대시보드로 직행해 그 흐름을 다시 못 보여준다.
 *
 * 전체 재시딩(`npm run seed`)으로도 되돌아가지만, 그러면 방문자들의 예약과
 * 소비자 풀 배정까지 날아간다. 부스 중간에는 사장님 축만 따로 되돌리는 편이 낫다.
 *
 * 지우는 것: 그 사장이 만든 가게와 딸린 딜·예약·알림
 * 건드리지 않는 것: 시딩된 가게 3곳, 소비자 계정, 풀 배정, 다른 가게의 예약
 *
 * 대상 DB는 **배포(Supabase)가 기본**이다. 부스에서 쓰는 스크립트이므로
 * server/.env에 주석으로 보존된 배포 주소를 자동으로 찾아 쓴다.
 * 로컬 Docker를 대상으로 하려면 --local 을 붙인다.
 *
 *   npm run reset:owner -w server
 *   npm run reset:owner -w server -- --local
 */

// seed.js의 '신규사장' — 클라이언트 역할 선택에서 사장님으로 매핑되는 계정
const DEMO_OWNER_EMAIL = 'owner4@hub.test'

/*
 * 배포 DB 주소 찾기.
 * server/.env는 로컬(Docker)을 활성 값으로 두고 배포 주소는 주석으로 보존한다
 * (docs/시연준비.md 참고). 주석 줄에서 꺼내 쓴다.
 */
function resolveDeployUrl() {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../.env')
  let text
  try {
    text = readFileSync(envPath, 'utf8')
  } catch {
    throw new Error('server/.env 를 읽을 수 없습니다.')
  }

  const active = text.match(/^\s*DATABASE_URL\s*=\s*(\S+)\s*$/m)?.[1]
  if (active && !/localhost|127\.0\.0\.1/.test(active)) return active

  const commented = text.match(/^\s*#\s*DATABASE_URL\s*=\s*(\S+)\s*$/m)?.[1]
  if (commented) return commented

  throw new Error(
    '배포 DB 주소를 찾지 못했습니다.\n' +
      'server/.env 에 배포용 DATABASE_URL 이 (주석으로라도) 있어야 합니다.\n' +
      '로컬을 대상으로 하려면 --local 을 붙이세요.',
  )
}

async function main() {
  const useLocal = process.argv.includes('--local')

  if (!useLocal) {
    // pool.js가 모듈 로드 시점에 DATABASE_URL을 읽으므로 import 전에 바꿔야 한다
    process.env.DATABASE_URL = resolveDeployUrl()
    process.env.DATABASE_SSL = 'true'
  }

  const { pool } = await import('../src/db/pool.js')
  const { withTransaction } = await import('../src/db/withTransaction.js')
  const { printTarget } = await import('./targetInfo.js')

  try {
    printTarget()
    console.log('')

    const result = await withTransaction(async (client) => {
      const { rows: owners } = await client.query(
        'SELECT id, nickname FROM users WHERE email = $1',
        [DEMO_OWNER_EMAIL],
      )
      if (owners.length === 0) {
        throw new Error(`${DEMO_OWNER_EMAIL} 계정이 없습니다. 먼저 seed 를 실행하세요.`)
      }
      const owner = owners[0]

      const { rows: stores } = await client.query(
        'SELECT id, name FROM stores WHERE owner_id = $1',
        [owner.id],
      )
      if (stores.length === 0) return { owner, store: null }
      const store = stores[0]

      // FK 순서대로: 예약 → 알림 → 딜 → 가게 (favorites는 ON DELETE CASCADE)
      const { rows: dealRows } = await client.query('SELECT id FROM deals WHERE store_id = $1', [
        store.id,
      ])
      const dealIds = dealRows.map((r) => r.id)

      let reservations = 0
      let notifications = 0
      if (dealIds.length > 0) {
        const r = await client.query('DELETE FROM reservations WHERE deal_id = ANY($1::bigint[])', [
          dealIds,
        ])
        reservations = r.rowCount
        const n = await client.query(
          'DELETE FROM notifications WHERE deal_id = ANY($1::bigint[])',
          [dealIds],
        )
        notifications = n.rowCount
        await client.query('DELETE FROM deals WHERE store_id = $1', [store.id])
      }

      const f = await client.query('DELETE FROM favorites WHERE store_id = $1', [store.id])
      await client.query('DELETE FROM stores WHERE id = $1', [store.id])

      return {
        owner,
        store,
        deleted: { deals: dealIds.length, reservations, notifications, favorites: f.rowCount },
      }
    })

    if (!result.store) {
      console.log(`${result.owner.nickname}: 이미 가게 미등록 상태입니다. W1 시연 가능합니다.`)
      return
    }

    const d = result.deleted
    console.log(`${result.owner.nickname}의 가게 "${result.store.name}" 삭제`)
    console.log(
      `  딜 ${d.deals} · 예약 ${d.reservations} · 알림 ${d.notifications} · 즐겨찾기 ${d.favorites}`,
    )
    console.log('')
    console.log('W1 가게 등록 시연이 다시 가능합니다.')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('사장님 축 초기화 실패:', err.message || err.code || '')
  process.exitCode = 1
})
