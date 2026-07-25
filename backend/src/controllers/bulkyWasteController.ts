import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { getBulkyWasteFee, getBulkyWasteItems } from '../services/bulkyWasteService'

const itemsQuerySchema = z.object({
  ctpvNm: z.string().trim().min(1),
  sggNm: z.string().trim().min(1),
})

const feeQuerySchema = itemsQuerySchema.extend({
  itemName: z.string().trim().min(1),
})

export async function getBulkyWasteItemsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { ctpvNm, sggNm } = itemsQuerySchema.parse(req.query)
    const items = await getBulkyWasteItems(ctpvNm, sggNm)
    res.json({ items })
  } catch (error) {
    next(error)
  }
}

export async function getBulkyWasteFeeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { ctpvNm, sggNm, itemName } = feeQuerySchema.parse(req.query)
    const result = await getBulkyWasteFee(ctpvNm, sggNm, itemName)
    res.json(result)
  } catch (error) {
    next(error)
  }
}
