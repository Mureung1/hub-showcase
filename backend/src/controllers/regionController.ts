import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { getDistrictsInProvince, getProvinces, getRegionRule, getZoneOptions } from '../services/regionRuleService'

const provinceQuerySchema = z.object({
  ctpvNm: z.string().trim().min(1),
})

const zoneQuerySchema = provinceQuerySchema.extend({
  sggNm: z.string().trim().min(1),
})

const ruleQuerySchema = zoneQuerySchema.extend({
  dongNm: z.string().trim().min(1),
})

export async function getProvincesHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const provinces = await getProvinces()
    res.json({ provinces })
  } catch (error) {
    next(error)
  }
}

export async function getDistrictsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { ctpvNm } = provinceQuerySchema.parse(req.query)
    const districts = await getDistrictsInProvince(ctpvNm)
    res.json({ districts })
  } catch (error) {
    next(error)
  }
}

export async function getZoneOptionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { ctpvNm, sggNm } = zoneQuerySchema.parse(req.query)
    const result = await getZoneOptions(ctpvNm, sggNm)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function getRegionRuleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { ctpvNm, sggNm, dongNm } = ruleQuerySchema.parse(req.query)
    const regionRule = await getRegionRule(ctpvNm, sggNm, dongNm)
    res.json({ regionRule })
  } catch (error) {
    next(error)
  }
}
