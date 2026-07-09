import { randomUUID } from 'node:crypto'

export function sessionId(req, res, next) {
  const incoming = req.get('X-Session-Id')
  req.sessionId = incoming || randomUUID()
  res.set('X-Session-Id', req.sessionId)
  next()
}
