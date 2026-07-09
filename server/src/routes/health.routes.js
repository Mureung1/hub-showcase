import { Router } from 'express'
import { db } from '../db/connection.js'

export const healthRouter = Router()

healthRouter.get('/health', (req, res) => {
  const { ok } = db.prepare('SELECT 1 AS ok').get()
  res.json({ status: 'ok', db: ok === 1 })
})
