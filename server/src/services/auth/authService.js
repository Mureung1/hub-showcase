import bcrypt from 'bcrypt';
import { query } from '../../data/db.js';
import { AppError } from '../../utils/errors.js';

const SALT_ROUNDS = 10;

export async function signup({ employeeNo, name, password, department }) {
  const existing = await query('SELECT id FROM users WHERE employee_no = $1', [employeeNo]);
  if (existing.rows.length > 0) {
    throw new AppError(409, 'employee_no_taken', '이미 등록된 사번입니다.');
  }

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const result = await query(
    'INSERT INTO users (employee_no, name, password_hash, department) VALUES ($1, $2, $3, $4) RETURNING *',
    [employeeNo, name, passwordHash, department ?? null]
  );

  return toPublicUser(result.rows[0]);
}

export async function login({ employeeNo, password }) {
  const result = await query('SELECT * FROM users WHERE employee_no = $1', [employeeNo]);
  const user = result.rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new AppError(401, 'invalid_credentials', '사번 또는 비밀번호가 올바르지 않습니다.');
  }
  return toPublicUser(user);
}

export async function getUserById(id) {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  const user = result.rows[0];
  return user ? toPublicUser(user) : null;
}

function toPublicUser(user) {
  const { password_hash, ...publicUser } = user;
  return publicUser;
}
