import pg from 'pg'

/*
 * Pool은 첫 쿼리 시점에 연결한다. DATABASE_URL은 server/.env에서 설정.
 *
 * SSL: 로컬 Docker Postgres는 SSL을 쓰지 않지만, 관리형 DB(Supabase 등)는 요구한다.
 * DATABASE_SSL=true 일 때만 켠다 — 로컬 개발에 영향을 주지 않기 위해서다.
 *
 * rejectUnauthorized: false 는 인증서 체인 검증을 생략한다. 중간자 공격 관점에서
 * 이상적이지 않지만, 관리형 DB의 CA 번들을 레포에 넣지 않고 붙이기 위한 실용적 절충이다.
 * (연결 자체는 암호화된다 — 평문 전송이 아니다.)
 */
const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ...(ssl ? { ssl } : {}),
})
