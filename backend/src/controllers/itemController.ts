import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { getItemDisposalRule, searchItems } from '../services/itemService'

const searchQuerySchema = z.object({
  q: z.string().trim().min(1),
})

const itemParamsSchema = z.object({
  id: z.string().trim().min(1),
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

export async function getItemDisposalRuleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = itemParamsSchema.parse(req.params)
    const result = await getItemDisposalRule(id)
    res.json(result)
  } catch (error) {
    next(error)
  }
}
