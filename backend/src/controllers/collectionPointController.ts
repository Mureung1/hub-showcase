import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { getCollectionPoints } from '../services/collectionPointService'

const CATEGORIES = ['건전지', '형광등', '소형가전', '종이팩', '폐의약품', '의류'] as const

const collectionPointsQuerySchema = z.object({
  category: z.enum(CATEGORIES),
  ctpvNm: z.string().trim().min(1),
  sggNm: z.string().trim().min(1),
})

export async function getCollectionPointsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { category, ctpvNm, sggNm } = collectionPointsQuerySchema.parse(req.query)
    const points = await getCollectionPoints(category, ctpvNm, sggNm)
    res.json({ points })
  } catch (error) {
    next(error)
  }
}
