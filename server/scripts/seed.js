import 'dotenv/config'
import { pool } from '../src/db/pool.js'
import { withTransaction } from '../src/db/withTransaction.js'
import { printTarget } from './targetInfo.js'

/*
 * 데모 시딩 (T-02) — 분당 정자동 클러스터 기준 (기준점: 네이버 1784, 정자일로 95)
 * 멱등: TRUNCATE ... RESTART IDENTITY CASCADE 후 재삽입하므로 반복 실행해도 결과가 같다.
 */

// 로그인 미구현 단계의 자리표시자. 회원가입(Backlog) 구현 시 bcrypt 해시로 대체한다.
const PASSWORD_HASH = 'seed-password-hash(temp)'

// 기획서 §3.1 — client/src/lib/constants.js, storeService.CATEGORIES와 동일하게 유지
const CATEGORIES = ['베이커리', '디저트', '신선식품', '반찬', '음료']

const USERS = [
  // 사장님 3명 (가게당 1명 — stores.owner_id UNIQUE)
  { email: 'owner1@hub.test', nickname: '베이커리사장', role: 'owner' },
  { email: 'owner2@hub.test', nickname: '디저트사장', role: 'owner' },
  { email: 'owner3@hub.test', nickname: '반찬사장', role: 'owner' },
  // 소비자 2명 — 위치 조건이 서로 다르다 (알림 판정 T-11 테스트 대비)
  {
    email: 'consumer1@hub.test',
    nickname: '규현',
    role: 'consumer',
    baseAddress: '경기 성남시 분당구 정자일로 95',
    baseLat: 37.3595,
    baseLng: 127.1052,
    notiLocationMode: 'radius',
    notiRadiusKm: 2.0,
    interests: ['베이커리', '디저트'],
  },
  {
    email: 'consumer2@hub.test',
    nickname: '소진',
    role: 'consumer',
    // 반경(2km) 밖에 두어 'always' 모드가 거리와 무관함을 시연한다 (1784에서 약 4km)
    baseAddress: '경기 성남시 분당구 판교역로 166',
    baseLat: 37.3948,
    baseLng: 127.1112,
    notiLocationMode: 'always',
    notiRadiusKm: 2.0,
    interests: ['반찬'],
  },
  // 가게 미등록 신규 사장 (id 6) — W1 가게 등록 흐름 데모용. 클라이언트 사장님 역할이 이 계정으로 매핑된다
  { email: 'owner4@hub.test', nickname: '신규사장', role: 'owner' },
]

const STORES = [
  {
    ownerEmail: 'owner1@hub.test',
    name: '한입 베이커리',
    category: '베이커리',
    address: '경기 성남시 분당구 정자일로 135',
    lat: 37.367,
    lng: 127.108,
  },
  {
    ownerEmail: 'owner2@hub.test',
    name: '달콤 디저트랩',
    category: '디저트',
    address: '경기 성남시 분당구 정자동 178',
    lat: 37.3648,
    lng: 127.1065,
  },
  {
    ownerEmail: 'owner3@hub.test',
    name: '엄마손 반찬',
    category: '반찬',
    address: '경기 성남시 분당구 미금로 55',
    lat: 37.3502,
    lng: 127.1085,
  },
]

// 활성 딜 5개. '조각 케이크'는 남은 수량 1 — 선착순 경합 데모용
// 픽업 마감은 8시간. 시연 도중 딜이 만료돼 목록이 비는 것을 막기 위한 값이다
// (마감이 지나면 T-14 만료 처리가 목록에서 제외한다 — docs/시연준비.md 참고)
const DEALS = [
  {
    store: '한입 베이커리',
    name: '크루아상',
    category: '베이커리',
    originalPrice: 4000,
    salePrice: 2000,
    totalQty: 5,
    remainingQty: 5,
    deadlineHours: 8,
  },
  {
    store: '한입 베이커리',
    name: '소금빵',
    category: '베이커리',
    originalPrice: 3000,
    salePrice: 1500,
    totalQty: 4,
    remainingQty: 4,
    deadlineHours: 8,
  },
  {
    store: '달콤 디저트랩',
    name: '조각 케이크',
    category: '디저트',
    originalPrice: 7000,
    salePrice: 3000,
    totalQty: 3,
    remainingQty: 1,
    deadlineHours: 8,
  },
  {
    store: '달콤 디저트랩',
    name: '마카롱 세트',
    category: '디저트',
    originalPrice: 12000,
    salePrice: 6000,
    totalQty: 2,
    remainingQty: 2,
    deadlineHours: 8,
  },
  {
    store: '엄마손 반찬',
    name: '제육볶음 도시락',
    category: '반찬',
    originalPrice: 9000,
    salePrice: 4500,
    totalQty: 6,
    remainingQty: 6,
    deadlineHours: 8,
  },
]

const FAVORITES = [
  { userEmail: 'consumer1@hub.test', store: '한입 베이커리' },
  { userEmail: 'consumer2@hub.test', store: '엄마손 반찬' },
]

/*
 * 시연용 소비자 풀 (로그인 미구현 단계의 임시 장치).
 * 부스 방문자가 QR로 들어올 때 한 명씩 배정받아 서로의 예약·알림이 섞이지 않게 한다.
 * 기준 위치는 전원 시연 장소(네이버 1784) — 방문자가 그 자리에 있다는 전제.
 */
const DEMO_POOL_SIZE = 40
const POOL_BASE = {
  address: '경기 성남시 분당구 정자일로 95',
  lat: 37.3595,
  lng: 127.1052,
  radiusKm: 2.0,
}

async function seed() {
  printTarget()

  const counts = await withTransaction(async (client) => {
    await client.query(`
      TRUNCATE users, stores, user_interest_categories, favorites,
               deals, reservations, device_tokens, notifications, demo_pool
      RESTART IDENTITY CASCADE
    `)

    const userIds = {}
    for (const u of USERS) {
      const { rows } = await client.query(
        `INSERT INTO users
           (email, password_hash, nickname, role,
            base_address, base_lat, base_lng, noti_location_mode, noti_radius_km)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'radius'), COALESCE($9, 2.0))
         RETURNING id`,
        [
          u.email,
          PASSWORD_HASH,
          u.nickname,
          u.role,
          u.baseAddress ?? null,
          u.baseLat ?? null,
          u.baseLng ?? null,
          u.notiLocationMode ?? null,
          u.notiRadiusKm ?? null,
        ],
      )
      userIds[u.email] = rows[0].id

      for (const category of u.interests ?? []) {
        await client.query(
          'INSERT INTO user_interest_categories (user_id, category) VALUES ($1, $2)',
          [rows[0].id, category],
        )
      }
    }

    const storeIds = {}
    for (const s of STORES) {
      const { rows } = await client.query(
        `INSERT INTO stores (owner_id, name, category, address, lat, lng)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userIds[s.ownerEmail], s.name, s.category, s.address, s.lat, s.lng],
      )
      storeIds[s.name] = rows[0].id
    }

    for (const d of DEALS) {
      await client.query(
        `INSERT INTO deals
           (store_id, name, category, original_price, sale_price,
            total_qty, remaining_qty, pickup_deadline_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now() + make_interval(hours => $8))`,
        [
          storeIds[d.store],
          d.name,
          d.category,
          d.originalPrice,
          d.salePrice,
          d.totalQty,
          d.remainingQty,
          d.deadlineHours,
        ],
      )
    }

    for (const f of FAVORITES) {
      await client.query('INSERT INTO favorites (user_id, store_id) VALUES ($1, $2)', [
        userIds[f.userEmail],
        storeIds[f.store],
      ])
    }

    // 시연용 소비자 풀 — 관심 카테고리를 고루 섞어 알림 대상 판정이 다양하게 걸리도록 한다
    for (let i = 1; i <= DEMO_POOL_SIZE; i++) {
      const { rows } = await client.query(
        `INSERT INTO users
           (email, password_hash, nickname, role,
            base_address, base_lat, base_lng, noti_location_mode, noti_radius_km)
         VALUES ($1, $2, $3, 'consumer', $4, $5, $6, 'radius', $7)
         RETURNING id`,
        [
          `demo${i}@hub.test`,
          PASSWORD_HASH,
          `방문자${i}`,
          POOL_BASE.address,
          POOL_BASE.lat,
          POOL_BASE.lng,
          POOL_BASE.radiusKm,
        ],
      )
      const poolUserId = rows[0].id

      const category = CATEGORIES[i % CATEGORIES.length]
      await client.query(
        'INSERT INTO user_interest_categories (user_id, category) VALUES ($1, $2)',
        [poolUserId, category],
      )
      await client.query('INSERT INTO demo_pool (user_id) VALUES ($1)', [poolUserId])
    }

    const result = {}
    for (const table of [
      'users',
      'stores',
      'deals',
      'favorites',
      'user_interest_categories',
      'demo_pool',
    ]) {
      const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${table}`)
      result[table] = rows[0].n
    }
    return result
  })

  console.log('seed 완료:', counts)
}

seed()
  .catch((err) => {
    console.error('seed 실패:', err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
