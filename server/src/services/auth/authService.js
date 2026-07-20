import bcrypt from 'bcrypt';
import db from '../../data/db.js';
import { AppError } from '../../utils/errors.js';

const SALT_ROUNDS = 10;

export function signup({ employeeNo, name, password, department }) {
  const existing = db.prepare('SELECT id FROM users WHERE employee_no = ?').get(employeeNo);
  if (existing) {
    throw new AppError(409, 'employee_no_taken', '이미 등록된 사번입니다.');
  }

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const result = db
    .prepare('INSERT INTO users (employee_no, name, password_hash, department) VALUES (?, ?, ?, ?)')
    .run(employeeNo, name, passwordHash, department ?? null);

  return toPublicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid));
}

export function login({ employeeNo, password }) {
  const user = db.prepare('SELECT * FROM users WHERE employee_no = ?').get(employeeNo);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new AppError(401, 'invalid_credentials', '사번 또는 비밀번호가 올바르지 않습니다.');
  }
  return toPublicUser(user);
}

export function getUserById(id) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return user ? toPublicUser(user) : null;
}

function toPublicUser(user) {
  const { password_hash, ...publicUser } = user;
  return publicUser;
}
