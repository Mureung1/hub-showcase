import pg from 'pg'

// Pool은 첫 쿼리 시점에 연결한다. DATABASE_URL은 server/.env에서 설정.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})
