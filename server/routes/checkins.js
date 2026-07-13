import { Router } from 'express'
import { getCheckins, createCheckin } from '../services/checkinService.js'
import { createSummary } from '../services/summaryService.js'

const router = Router()

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next)
    } catch (err) {
      next(err)
    }
  }
}

function getRawText(body) {
  const rawText = body.rawText || body.raw_text || body.text

  if (typeof rawText !== 'string' || !rawText.trim()) {
    const error = new Error('하루 감정 텍스트를 입력해 주세요.')
    error.status = 400
    throw error
  }

  return rawText.trim()
}

router.get('/', asyncHandler(async (req, res) => {
  const checkins = await getCheckins()
  res.json(checkins)
}))

router.post('/preview', asyncHandler(async (req, res) => {
  const rawText = getRawText(req.body)
  const summary = await createSummary(rawText)

  res.json({ rawText, ...summary })
}))

router.post('/', asyncHandler(async (req, res) => {
  const rawText = getRawText(req.body)
  const checkin = await createCheckin({
    ...req.body,
    rawText,
  })
  res.status(201).json(checkin)
}))

export default router
