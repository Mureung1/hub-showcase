import { pool } from '../db/pool.js'

function toStore(row) {
  return {
    id: Number(row.id),
    ownerId: Number(row.owner_id),
    name: row.name,
    category: row.category,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
  }
}

export async function findByOwnerId(ownerId, db = pool) {
  const { rows } = await db.query('SELECT * FROM stores WHERE owner_id = $1', [ownerId])
  return rows.length ? toStore(rows[0]) : null
}

/*
 * M1 가게 검색 — 이름 부분 일치(검색어 없으면 전체).
 * 요청자의 즐겨찾기 여부를 함께 반환해 목록에서 바로 토글할 수 있게 한다.
 */
export async function searchWithFavorite({ userId, keyword }, db = pool) {
  const { rows } = await db.query(
    `SELECT s.*, (f.user_id IS NOT NULL) AS is_favorite
     FROM stores s
     LEFT JOIN favorites f ON f.store_id = s.id AND f.user_id = $1
     WHERE ($2::text IS NULL OR s.name ILIKE '%' || $2 || '%')
     ORDER BY s.name`,
    [userId, keyword || null],
  )
  return rows.map((row) => ({ ...toStore(row), isFavorite: row.is_favorite }))
}

/*
 * M1 — 내가 즐겨찾기한 가게만. 검색 결과(searchWithFavorite)와 화면에서 영역을 나누기 위함이다.
 * 전체 목록에 새 가게가 섞여 나오면 "관심 가게에 자동 등록됐다"고 읽히기 쉬웠다.
 */
export async function listFavorites(userId, db = pool) {
  const { rows } = await db.query(
    `SELECT s.*
     FROM favorites f
     JOIN stores s ON s.id = f.store_id
     WHERE f.user_id = $1
     ORDER BY s.name`,
    [userId],
  )
  return rows.map((row) => ({ ...toStore(row), isFavorite: true }))
}

export async function findById(id, db = pool) {
  const { rows } = await db.query('SELECT * FROM stores WHERE id = $1', [id])
  return rows.length ? toStore(rows[0]) : null
}

export async function insert({ ownerId, name, category, address, lat, lng }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO stores (owner_id, name, category, address, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [ownerId, name, category, address, lat, lng],
  )
  return toStore(rows[0])
}
