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

export async function insert({ ownerId, name, category, address, lat, lng }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO stores (owner_id, name, category, address, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [ownerId, name, category, address, lat, lng],
  )
  return toStore(rows[0])
}
