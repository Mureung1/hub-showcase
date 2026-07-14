import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { searchItems } from '../services/itemService'

const searchQuerySchema = z.object({
  q: z.string().trim().min(1),
})

export async function searchItemsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { q } = searchQuerySchema.parse(req.query)
    const items = await searchItems(q)
    res.json({ items })
  } catch (error) {
    next(error)
  }
}
