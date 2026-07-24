import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { getCollectionPoints } from '../services/collectionPointService'

const CATEGORIES = ['건전지', '형광등', '소형가전', '종이팩'] as const

const collectionPointsQuerySchema = z.object({
  category: z.enum(CATEGORIES),
})

export async function getCollectionPointsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { category } = collectionPointsQuerySchema.parse(req.query)
    const points = await getCollectionPoints(category)
    res.json({ points })
  } catch (error) {
    next(error)
  }
}
