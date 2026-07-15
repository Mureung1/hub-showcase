import { ApiError } from '../middleware/errorHandler.js'
import { signup as signupUser, login as loginUser, logout as logoutUser, getUserByToken } from '../services/auth.service.js'

function extractToken(req) {
  const header = req.get('Authorization') || ''
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

export function signup(req, res) {
  const { email, password } = req.body || {}
  const result = signupUser(email, password)
  res.status(201).json(result)
}

export function login(req, res) {
  const { email, password } = req.body || {}
  const result = loginUser(email, password)
  res.json(result)
}

export function logout(req, res) {
  const token = extractToken(req)
  if (token) logoutUser(token)
  res.status(204).end()
}

export function me(req, res) {
  const token = extractToken(req)
  const user = getUserByToken(token)
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요해요.')
  }
  res.json({ user })
}
