import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { db } from '../db/db.js'
import { ApiError } from '../middleware/errorHandler.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

const insertUserStmt = db.prepare(`
  INSERT INTO users (email, password_hash) VALUES (?, ?)
`)
const findUserByEmailStmt = db.prepare(`SELECT * FROM users WHERE email = ?`)
const findUserByIdStmt = db.prepare(`SELECT * FROM users WHERE id = ?`)
const insertTokenStmt = db.prepare(`INSERT INTO auth_tokens (token, user_id) VALUES (?, ?)`)
const findTokenStmt = db.prepare(`SELECT * FROM auth_tokens WHERE token = ?`)
const deleteTokenStmt = db.prepare(`DELETE FROM auth_tokens WHERE token = ?`)

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const hashBuffer = Buffer.from(hash, 'hex')
  const suppliedBuffer = scryptSync(password, salt, 64)
  return hashBuffer.length === suppliedBuffer.length && timingSafeEqual(hashBuffer, suppliedBuffer)
}

function validateCredentials(email, password) {
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, 'INVALID_EMAIL', '올바른 이메일 형식이 아니에요.')
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(400, 'WEAK_PASSWORD', `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 해요.`)
  }
}

function issueToken(userId) {
  const token = randomBytes(32).toString('hex')
  insertTokenStmt.run(token, userId)
  return token
}

function toPublicUser(user) {
  return { id: user.id, email: user.email }
}

export function signup(email, password) {
  validateCredentials(email, password)

  if (findUserByEmailStmt.get(email)) {
    throw new ApiError(409, 'EMAIL_TAKEN', '이미 가입된 이메일이에요.')
  }

  const { lastInsertRowid } = insertUserStmt.run(email, hashPassword(password))
  const token = issueToken(lastInsertRowid)
  return { user: toPublicUser({ id: lastInsertRowid, email }), token }
}

export function login(email, password) {
  const user = findUserByEmailStmt.get(email)
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않아요.')
  }

  const token = issueToken(user.id)
  return { user: toPublicUser(user), token }
}

export function logout(token) {
  deleteTokenStmt.run(token)
}

export function getUserByToken(token) {
  if (!token) return null
  const row = findTokenStmt.get(token)
  if (!row) return null
  const user = findUserByIdStmt.get(row.user_id)
  return user ? toPublicUser(user) : null
}
