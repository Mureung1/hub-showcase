import jwt from 'jsonwebtoken'

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET)
}

export function signRedirectState(path) {
  return jwt.sign({ path, purpose: 'redirect' }, process.env.JWT_SECRET, {
    expiresIn: '10m',
  })
}

export function verifyRedirectState(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET)
  const { path } = payload
  const isSafeRelativePath = typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.includes('://')
  if (payload.purpose !== 'redirect' || !isSafeRelativePath) {
    throw new Error('유효하지 않은 state입니다.')
  }
  return path
}
