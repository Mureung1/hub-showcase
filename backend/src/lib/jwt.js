import jwt from 'jsonwebtoken'

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET)
}
