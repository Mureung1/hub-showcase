import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { VideoPost } from '@prisma/client'
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { buildPublicUrl, storageClient, STORAGE_BUCKET } from '../lib/storage.js'
import { upsertDailyDiary } from '../lib/dodo.js'

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

// 친구 피드 — 카테고리 공개 그룹 로직은 GET /api/friends/:friendId/schedules와 동일한 규칙을 따른다:
// 내가 그 친구의 공유 그룹 멤버로 속한 그룹 → 그 그룹에 공개된 그 친구의 카테고리 → 그 카테고리의 영상만 노출.
videosRouter.get('/feed', asyncHandler(async (req, res) => {
  const friendships = await prisma.friendship.findMany({
    where: { userId: req.userId! },
    select: { friendId: true },
  })
  const friendIds = friendships.map((friendship) => friendship.friendId)
  if (friendIds.length === 0) {
    res.json([])
    return
  }

  const memberships = await prisma.shareGroupMember.findMany({
    where: { friendUserId: req.userId!, group: { ownerId: { in: friendIds } } },
    select: { groupId: true },
  })
  const groupIds = memberships.map((membership) => membership.groupId)
  if (groupIds.length === 0) {
    res.json([])
    return
  }

  const visibilities = await prisma.categoryVisibility.findMany({
    where: { shareGroupId: { in: groupIds }, category: { userId: { in: friendIds } } },
    select: { categoryId: true },
  })
  const categoryIds = [...new Set(visibilities.map((entry) => entry.categoryId))]
  if (categoryIds.length === 0) {
    res.json([])
    return
  }

  const videos = await prisma.videoPost.findMany({
    where: {
      deletedAt: null,
      userId: { in: friendIds },
      schedule: { categoryId: { in: categoryIds } },
    },
    include: {
      schedule: { include: { category: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  res.json(videos.map((video) => ({
    id: video.id,
    friendId: video.user.id,
    friendName: video.user.name,
    url: buildPublicUrl(video.storageKey),
    contentType: video.contentType,
    sizeBytes: video.sizeBytes,
    durationSeconds: video.durationSeconds,
    caption: video.caption,
    categoryName: video.schedule.category.name,
    tone: video.schedule.category.tone,
    createdAt: video.createdAt.toISOString(),
  })))
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

  // 오늘의 두두 일기를 갱신한다 — 실패해도 영상 업로드 자체는 이미 성공했으니 로그만 남기고 응답은 정상 처리한다.
  upsertDailyDiary(req.userId!, video.createdAt).catch((error) => {
    console.error('두두 일기 갱신 실패:', error)
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

  // 이 영상이 그날의 일기 대표 영상이었을 수 있으니 다시 계산한다 — 남은 영상 중 최신 것으로 교체되거나,
  // 하나도 안 남았으면 일기 자체가 삭제된다(upsertDailyDiary 내부 처리).
  upsertDailyDiary(req.userId!, existing.createdAt).catch((error) => {
    console.error('영상 삭제 후 두두 일기 재계산 실패:', error)
  })

  res.status(204).end()
}))

function toCommentResponse(comment: { id: string; authorId: string; author: { name: string }; text: string; createdAt: Date }) {
  return {
    id: comment.id,
    authorId: comment.authorId,
    authorName: comment.author.name,
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
  }
}

videosRouter.get('/:id/comments', asyncHandler(async (req, res) => {
  const video = await prisma.videoPost.findUnique({ where: { id: req.params.id } })
  if (!video || video.deletedAt) {
    res.status(404).json({ error: '존재하지 않는 영상입니다.' })
    return
  }

  const [comments, friendships] = await Promise.all([
    prisma.comment.findMany({
      where: { videoPostId: video.id },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.friendship.findMany({ where: { userId: req.userId }, select: { friendId: true } }),
  ])
  const friendIds = new Set(friendships.map((friendship) => friendship.friendId))

  // 방문자 입장에서 제3자(나도 아니고 영상 주인도 아닌 사람)의 댓글은 그 사람과 친구일 때만 보인다.
  const visible = comments.filter((comment) =>
    comment.authorId === req.userId || comment.authorId === video.userId || friendIds.has(comment.authorId))

  res.json(visible.map(toCommentResponse))
}))

videosRouter.post('/:id/comments', asyncHandler(async (req, res) => {
  const video = await prisma.videoPost.findUnique({ where: { id: req.params.id } })
  if (!video || video.deletedAt) {
    res.status(404).json({ error: '존재하지 않는 영상입니다.' })
    return
  }

  const { text } = req.body as Record<string, unknown>
  if (!isNonEmptyString(text) || text.length > 300) {
    res.status(400).json({ error: 'text는 1~300자여야 합니다.' })
    return
  }

  const comment = await prisma.comment.create({
    data: { videoPostId: video.id, authorId: req.userId!, text: text.trim() },
    include: { author: { select: { name: true } } },
  })

  res.status(201).json(toCommentResponse(comment))
}))

videosRouter.delete('/:id/comments/:commentId', asyncHandler(async (req, res) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.commentId } })
  if (!comment || comment.videoPostId !== req.params.id || comment.authorId !== req.userId) {
    res.status(404).json({ error: '존재하지 않는 댓글입니다.' })
    return
  }

  await prisma.comment.delete({ where: { id: comment.id } })
  res.status(204).end()
}))
