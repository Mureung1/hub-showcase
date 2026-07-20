import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { VideoPost } from '@prisma/client'
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { buildPublicUrl, storageClient, STORAGE_BUCKET } from '../lib/storage.js'

export const videosRouter = Router()
videosRouter.use(requireAuth)

const MAX_VIDEO_BYTES = 25 * 1024 * 1024 // 5초 내 짧은 인증 영상 기준 25MB면 넉넉함
const MAX_DURATION_SECONDS = 30

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'video/webm': 'webm',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

type VideoPostWithCategory = VideoPost & { schedule: { category: { name: string; tone: string } } }

function toResponse(video: VideoPostWithCategory) {
  return {
    id: video.id,
    scheduleId: video.scheduleId,
    url: buildPublicUrl(video.storageKey),
    contentType: video.contentType,
    sizeBytes: video.sizeBytes,
    durationSeconds: video.durationSeconds,
    caption: video.caption,
    categoryName: video.schedule.category.name,
    tone: video.schedule.category.tone,
    createdAt: video.createdAt.toISOString(),
  }
}

videosRouter.get('/mine', asyncHandler(async (req, res) => {
  const videos = await prisma.videoPost.findMany({
    where: { userId: req.userId, deletedAt: null },
    include: { schedule: { include: { category: true } } },
    orderBy: { createdAt: 'desc' },
  })

  res.json(videos.map(toResponse))
}))

videosRouter.post('/presign', asyncHandler(async (req, res) => {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { scheduleId, contentType } = body as Record<string, unknown>
  if (!isNonEmptyString(scheduleId)) {
    res.status(400).json({ error: 'scheduleId는 필수입니다.' })
    return
  }
  if (!isNonEmptyString(contentType) || !(contentType in CONTENT_TYPE_EXTENSIONS)) {
    res.status(400).json({ error: `contentType은 ${Object.keys(CONTENT_TYPE_EXTENSIONS).join('/')} 중 하나여야 합니다.` })
    return
  }

  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } })
  if (!schedule || schedule.userId !== req.userId) {
    res.status(404).json({ error: '존재하지 않는 일정입니다.' })
    return
  }

  const extension = CONTENT_TYPE_EXTENSIONS[contentType]
  const storageKey = `videos/${req.userId}/${randomUUID()}.${extension}`

  const uploadUrl = await getSignedUrl(
    storageClient,
    new PutObjectCommand({ Bucket: STORAGE_BUCKET, Key: storageKey, ContentType: contentType }),
    { expiresIn: 300 },
  )

  res.json({ uploadUrl, storageKey })
}))

videosRouter.post('/', asyncHandler(async (req, res) => {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { scheduleId, storageKey, contentType, sizeBytes, durationSeconds, caption } = body as Record<string, unknown>

  if (!isNonEmptyString(scheduleId)) {
    res.status(400).json({ error: 'scheduleId는 필수입니다.' })
    return
  }
  if (!isNonEmptyString(storageKey) || !storageKey.startsWith(`videos/${req.userId}/`)) {
    res.status(400).json({ error: 'storageKey가 올바르지 않습니다.' })
    return
  }
  if (!isNonEmptyString(contentType) || !(contentType in CONTENT_TYPE_EXTENSIONS)) {
    res.status(400).json({ error: `contentType은 ${Object.keys(CONTENT_TYPE_EXTENSIONS).join('/')} 중 하나여야 합니다.` })
    return
  }
  if (!isPositiveInt(sizeBytes) || sizeBytes > MAX_VIDEO_BYTES) {
    res.status(400).json({ error: `sizeBytes는 1~${MAX_VIDEO_BYTES} 사이의 정수여야 합니다.` })
    return
  }
  if (!isPositiveInt(durationSeconds) || durationSeconds > MAX_DURATION_SECONDS) {
    res.status(400).json({ error: `durationSeconds는 1~${MAX_DURATION_SECONDS} 사이의 정수여야 합니다.` })
    return
  }
  if (caption !== undefined && typeof caption !== 'string') {
    res.status(400).json({ error: 'caption은 문자열이어야 합니다.' })
    return
  }

  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } })
  if (!schedule || schedule.userId !== req.userId) {
    res.status(404).json({ error: '존재하지 않는 일정입니다.' })
    return
  }

  const video = await prisma.videoPost.create({
    data: {
      scheduleId,
      userId: req.userId!,
      storageKey,
      contentType,
      sizeBytes,
      durationSeconds,
      caption: isNonEmptyString(caption) ? caption : null,
    },
    include: { schedule: { include: { category: true } } },
  })

  res.status(201).json(toResponse(video))
}))

videosRouter.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.videoPost.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.userId !== req.userId || existing.deletedAt) {
    res.status(404).json({ error: '존재하지 않는 영상입니다.' })
    return
  }

  await prisma.videoPost.update({ where: { id: existing.id }, data: { deletedAt: new Date() } })

  // 스토리지 원본 파일도 함께 삭제 — 실패해도 DB에서는 이미 숨겨졌으니 응답은 정상 처리한다.
  try {
    await storageClient.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: existing.storageKey }))
  } catch (error) {
    console.error('스토리지 영상 삭제 실패:', error)
  }

  res.status(204).end()
}))
