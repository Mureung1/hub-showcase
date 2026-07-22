import { ApiError } from '../middleware/errorHandler.js'
import { signup as signupUser, login as loginUser, logout as logoutUser } from '../services/auth.service.js'
import { extractToken } from '../middleware/optionalAuth.js'

export async function signup(req, res) {
  const { email, password } = req.body || {}
  const result = await signupUser(email, password)
  res.status(201).json(result)
}

export async function login(req, res) {
  const { email, password } = req.body || {}
  const result = await loginUser(email, password)
  res.json(result)
}

export async function logout(req, res) {
  const token = extractToken(req)
  if (token) await logoutUser(token)
  res.status(204).end()
}

export async function me(req, res) {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요해요.')
  }
  res.json({ user: req.user })
}
