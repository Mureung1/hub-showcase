import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const friendsRouter = Router()
friendsRouter.use(requireAuth)

const friendSelect = { id: true, name: true, email: true } as const

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

friendsRouter.get('/', asyncHandler(async (req, res) => {
  const friendships = await prisma.friendship.findMany({
    where: { userId: req.userId },
    include: { friend: { select: friendSelect } },
    orderBy: { createdAt: 'asc' },
  })

  res.json(friendships.map((friendship) => friendship.friend))
}))

friendsRouter.get('/requests', asyncHandler(async (req, res) => {
  const [incoming, outgoing] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { toUserId: req.userId },
      include: { fromUser: { select: friendSelect } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendRequest.findMany({
      where: { fromUserId: req.userId },
      include: { toUser: { select: friendSelect } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  res.json({
    incoming: incoming.map((request) => ({
      id: request.id,
      user: request.fromUser,
      createdAt: request.createdAt.toISOString(),
    })),
    outgoing: outgoing.map((request) => ({
      id: request.id,
      user: request.toUser,
      createdAt: request.createdAt.toISOString(),
    })),
  })
}))

friendsRouter.post('/requests', asyncHandler(async (req, res) => {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { email } = body as Record<string, unknown>
  if (!isNonEmptyString(email)) {
    res.status(400).json({ error: 'email은 필수입니다.' })
    return
  }

  const target = await prisma.user.findUnique({ where: { email }, select: friendSelect })
  if (!target) {
    res.status(404).json({ error: '해당 이메일의 사용자를 찾을 수 없습니다.' })
    return
  }
  if (target.id === req.userId) {
    res.status(400).json({ error: '자기 자신에게는 친구 요청을 보낼 수 없습니다.' })
    return
  }

  const existingFriendship = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: req.userId!, friendId: target.id } },
  })
  if (existingFriendship) {
    res.status(409).json({ error: '이미 친구입니다.' })
    return
  }

  const reverseRequest = await prisma.friendRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId: target.id, toUserId: req.userId! } },
  })
  if (reverseRequest) {
    await prisma.$transaction([
      prisma.friendship.create({ data: { userId: req.userId!, friendId: target.id } }),
      prisma.friendship.create({ data: { userId: target.id, friendId: req.userId! } }),
      prisma.friendRequest.delete({ where: { id: reverseRequest.id } }),
    ])
    res.json({ status: 'friended', friend: target })
    return
  }

  const existingRequest = await prisma.friendRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId: req.userId!, toUserId: target.id } },
  })
  if (existingRequest) {
    res.status(409).json({ error: '이미 요청을 보냈습니다.' })
    return
  }

  await prisma.friendRequest.create({ data: { fromUserId: req.userId!, toUserId: target.id } })
  res.status(201).json({ status: 'requested' })
}))

friendsRouter.post('/requests/:id/accept', asyncHandler(async (req, res) => {
  const request = await prisma.friendRequest.findUnique({
    where: { id: req.params.id },
    include: { fromUser: { select: friendSelect } },
  })
  if (!request || request.toUserId !== req.userId) {
    res.status(404).json({ error: '존재하지 않는 요청입니다.' })
    return
  }

  await prisma.$transaction([
    prisma.friendship.create({ data: { userId: req.userId!, friendId: request.fromUserId } }),
    prisma.friendship.create({ data: { userId: request.fromUserId, friendId: req.userId! } }),
    prisma.friendRequest.delete({ where: { id: request.id } }),
  ])

  res.json(request.fromUser)
}))

friendsRouter.delete('/requests/:id', asyncHandler(async (req, res) => {
  const request = await prisma.friendRequest.findUnique({ where: { id: req.params.id } })
  if (!request || (request.fromUserId !== req.userId && request.toUserId !== req.userId)) {
    res.status(404).json({ error: '존재하지 않는 요청입니다.' })
    return
  }

  await prisma.friendRequest.delete({ where: { id: request.id } })
  res.status(204).end()
}))

friendsRouter.get('/:friendId/schedules', asyncHandler(async (req, res) => {
  const { friendId } = req.params

  const friendship = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: req.userId!, friendId } },
  })
  if (!friendship) {
    res.status(404).json({ error: '친구가 아닙니다.' })
    return
  }

  const memberships = await prisma.shareGroupMember.findMany({
    where: { friendUserId: req.userId!, group: { ownerId: friendId } },
    select: { groupId: true },
  })
  const groupIds = memberships.map((membership) => membership.groupId)
  if (groupIds.length === 0) {
    res.json([])
    return
  }

  const visibilities = await prisma.categoryVisibility.findMany({
    where: { shareGroupId: { in: groupIds }, category: { userId: friendId } },
    select: { categoryId: true },
  })
  const categoryIds = [...new Set(visibilities.map((entry) => entry.categoryId))]
  if (categoryIds.length === 0) {
    res.json([])
    return
  }

  const schedules = await prisma.schedule.findMany({
    where: { userId: friendId, categoryId: { in: categoryIds } },
    include: { category: true },
    orderBy: { date: 'asc' },
  })

  res.json(schedules.map((schedule) => ({
    id: schedule.id,
    date: schedule.date.toISOString().slice(0, 10),
    title: schedule.title,
    time: schedule.time ?? '',
    categoryName: schedule.category.name,
    tone: schedule.category.tone,
  })))
}))

friendsRouter.delete('/:friendId', asyncHandler(async (req, res) => {
  const { friendId } = req.params
  const existing = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: req.userId!, friendId } },
  })
  if (!existing) {
    res.status(404).json({ error: '존재하지 않는 친구입니다.' })
    return
  }

  const myGroups = await prisma.shareGroup.findMany({ where: { ownerId: req.userId! }, select: { id: true } })
  const myGroupIds = myGroups.map((group) => group.id)

  await prisma.$transaction([
    prisma.friendship.deleteMany({
      where: { OR: [{ userId: req.userId!, friendId }, { userId: friendId, friendId: req.userId! }] },
    }),
    ...(myGroupIds.length
      ? [prisma.shareGroupMember.deleteMany({ where: { friendUserId: friendId, groupId: { in: myGroupIds } } })]
      : []),
  ])

  res.status(204).end()
}))
