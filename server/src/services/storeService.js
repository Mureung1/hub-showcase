import { pool } from '../db/pool.js'
import { httpError } from '../lib/httpError.js'

export const CATEGORIES = ['베이커리', '디저트', '신선식품', '반찬', '음료']

function toStoreDto(row) {
  return {
    // pg는 BIGINT(int8)를 문자열로 반환한다 — API JSON은 숫자로 통일
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

export async function getMyStore(userId) {
  const { rows } = await pool.query('SELECT * FROM stores WHERE owner_id = $1', [userId])
  if (rows.length === 0) throw httpError(404, '등록된 가게가 없습니다.')
  return toStoreDto(rows[0])
}

export async function createStore(userId, { name, category, address, lat, lng }) {
  if (!name?.trim() || !address?.trim()) throw httpError(400, '상호명과 주소를 입력해주세요.')
  if (!CATEGORIES.includes(category)) throw httpError(400, '카테고리를 선택해주세요.')
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw httpError(400, '위치 좌표가 올바르지 않습니다.')

  // role 정합성은 서비스 레이어 담당 (docs/erd.md 결정)
  const { rows: users } = await pool.query('SELECT role FROM users WHERE id = $1', [userId])
  if (users.length === 0) throw httpError(401, '존재하지 않는 사용자입니다.')
  if (users[0].role !== 'owner') throw httpError(403, '사장님 계정만 가게를 등록할 수 있습니다.')

  const { rows: existing } = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [userId])
  if (existing.length > 0) throw httpError(409, '이미 등록된 가게가 있습니다.')

  const { rows } = await pool.query(
    `INSERT INTO stores (owner_id, name, category, address, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, name.trim(), category, address.trim(), lat, lng],
  )
  return toStoreDto(rows[0])
}
