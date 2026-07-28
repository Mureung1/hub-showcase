import pg from "pg";

const { Pool } = pg;

// PostgreSQL 연결 풀 생성
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 연결 풀 에러 핸들링
pool.on("error", (err) => {
  console.error("예상치 못한 데이터베이스 풀 에러:", err);
});

// 데이터베이스 초기화 함수 (테이블 생성)
export async function initializeDatabase() {
  try {
    // 테이블 생성 (이미 존재하면 무시)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notices (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL PRIMARY KEY,
        notice_id BIGINT,
        user_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        deadline TEXT,
        time_start TEXT,
        time_end TEXT,
        location TEXT,
        deliverables TEXT,
        notes TEXT,
        category TEXT DEFAULT '기타',
        is_selected BOOLEAN DEFAULT true,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (notice_id) REFERENCES notices(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // category 컬럼 추가 시도 (이미 있으면 무시)
    try {
      await pool.query(`ALTER TABLE events ADD COLUMN category TEXT DEFAULT '기타';`);
    } catch (e) {
      // 컬럼이 이미 존재하는 경우 무시
    }

    console.log("데이터베이스 테이블 초기화 완료");
  } catch (error) {
    console.error("데이터베이스 초기화 실패:", error.message);
    throw error;
  }
}

export default pool;