import { Router } from 'express'
import multer from 'multer'
import { getCheckins, createCheckin, deleteCheckin } from '../services/checkinService.js'
import { createReportAnalysis, createSummary } from '../services/summaryService.js'
import { uploadCheckinPhoto } from '../services/storageService.js'
import { isDemoMode } from '../config/runtimeMode.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      const error = new Error('이미지 파일만 업로드할 수 있어요.')
      error.status = 400
      cb(error)
    }
  },
})

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next)
    } catch (err) {
      next(err)
    }
  }
}

function requireDemoStorage(req, res, next) {
  if (!isDemoMode()) {
    const error = new Error(
      '로그인 기록은 Supabase Auth와 RLS를 통해 직접 처리합니다.',
    )
    error.status = 410
    next(error)
    return
  }

  next()
}

const MOODS = ['😌', '🙂', '😐', '😞', '😢']

function getMood(body) {
  if (body.mood == null || body.mood === '') {
    return null
  }

  if (!MOODS.includes(body.mood)) {
    const error = new Error('기분 이모지 값이 올바르지 않습니다.')
    error.status = 400
    throw error
  }

  return body.mood
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

function getReportText(body) {
  const reportText = body.reportText

  if (typeof reportText !== 'string' || !reportText.trim()) {
    const error = new Error('AI로 정리할 리포트가 없습니다.')
    error.status = 400
    throw error
  }

  if (reportText.length > 10000) {
    const error = new Error('AI로 정리할 리포트가 너무 깁니다.')
    error.status = 400
    throw error
  }

  return reportText.trim()
}

router.get('/', requireDemoStorage, asyncHandler(async (req, res) => {
  const checkins = await getCheckins()
  res.json(checkins)
}))

router.post('/preview', asyncHandler(async (req, res) => {
  const rawText = getRawText(req.body)
  const summary = await createSummary(rawText)

  res.json({ rawText, ...summary })
}))

router.post('/report-analysis', asyncHandler(async (req, res) => {
  const reportText = getReportText(req.body)
  const analysis = await createReportAnalysis(reportText)

  res.json(analysis)
}))

router.post('/photo', requireDemoStorage, upload.single('photo'), asyncHandler(async (req, res) => {
  if (!req.file) {
    const error = new Error('업로드할 사진이 없습니다.')
    error.status = 400
    throw error
  }

  const imageUrl = await uploadCheckinPhoto(req.file)
  res.status(201).json({ imageUrl })
}))

router.post('/', requireDemoStorage, asyncHandler(async (req, res) => {
  const rawText = getRawText(req.body)
  const mood = getMood(req.body)
  const checkin = await createCheckin({
    ...req.body,
    rawText,
    mood,
  })
  res.status(201).json(checkin)
}))

router.delete('/:id', requireDemoStorage, asyncHandler(async (req, res) => {
  await deleteCheckin(req.params.id)
  res.status(204).end()
}))

export default router
