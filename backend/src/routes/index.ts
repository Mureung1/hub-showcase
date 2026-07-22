import { Router } from 'express'
import multer from 'multer'
import { getItemDisposalRuleHandler, searchItemsHandler } from '../controllers/itemController'
import { recognizeItemHandler } from '../controllers/recognizeController'
import {
  getDistrictsHandler,
  getProvincesHandler,
  getRegionRuleHandler,
  getZoneOptionsHandler,
} from '../controllers/regionController'
import { AppError } from '../middlewares/errorHandler'

export const router = Router()

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(new AppError('지원하지 않는 파일 형식입니다 (jpeg/png/webp만 허용)', 400))
      return
    }
    callback(null, true)
  },
})

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

router.get('/items/search', searchItemsHandler)
router.get('/items/:id/disposal-rule', getItemDisposalRuleHandler)
router.post('/recognize', upload.single('photo'), recognizeItemHandler)
router.get('/regions/provinces', getProvincesHandler)
router.get('/regions/districts', getDistrictsHandler)
router.get('/regions/zones', getZoneOptionsHandler)
router.get('/regions/rules', getRegionRuleHandler)
