import { Router } from 'express'
import multer from 'multer'
import { getCheckins, createCheckin } from '../services/checkinService.js'
import { createSummary } from '../services/summaryService.js'
import { uploadCheckinPhoto } from '../services/storageService.js'

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

router.get('/', asyncHandler(async (req, res) => {
  const checkins = await getCheckins()
  res.json(checkins)
}))

router.post('/preview', asyncHandler(async (req, res) => {
  const rawText = getRawText(req.body)
  const summary = await createSummary(rawText)

  res.json({ rawText, ...summary })
}))

router.post('/photo', upload.single('photo'), asyncHandler(async (req, res) => {
  if (!req.file) {
    const error = new Error('업로드할 사진이 없습니다.')
    error.status = 400
    throw error
  }

  const imageUrl = await uploadCheckinPhoto(req.file)
  res.status(201).json({ imageUrl })
}))

router.post('/', asyncHandler(async (req, res) => {
  const rawText = getRawText(req.body)
  const mood = getMood(req.body)
  const checkin = await createCheckin({
    ...req.body,
    rawText,
    mood,
  })
  res.status(201).json(checkin)
}))

export default router
