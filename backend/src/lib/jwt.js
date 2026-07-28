import jwt from 'jsonwebtoken'

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET)
}

export function signInviteState(subscriptionId) {
  return jwt.sign({ sid: subscriptionId, purpose: 'invite' }, process.env.JWT_SECRET, {
    expiresIn: '10m',
  })
}

export function verifyInviteState(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET)
  if (payload.purpose !== 'invite' || !payload.sid) {
    throw new Error('유효하지 않은 state입니다.')
  }
  return payload.sid
}
