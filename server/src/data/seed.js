import bcrypt from 'bcrypt';
import pool from './db.js';

// 배포 후 테스터가 바로 쓸 수 있도록 데모 계정을 보장한다. 이미 있으면 건드리지 않아
// 여러 번 기동해도 안전하다. 값은 환경변수로 덮을 수 있고 기본은 사번 1 / 12345678.
export async function seedDemoUser() {
  const employeeNo = process.env.DEMO_EMPLOYEE_NO || '1';
  const password = process.env.DEMO_PASSWORD || '12345678';
  const passwordHash = bcrypt.hashSync(password, 10);

  await pool.query(
    `INSERT INTO users (employee_no, name, password_hash, department)
     SELECT $1, '데모 계정', $2, '데모'
     WHERE NOT EXISTS (SELECT 1 FROM users WHERE employee_no = $1)`,
    [employeeNo, passwordHash]
  );
}
