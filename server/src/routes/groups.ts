import { Router } from 'express'
import type { ShareGroup, ShareGroupMember } from '@prisma/client'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const groupsRouter = Router()
groupsRouter.use(requireAuth)

const friendSelect = { id: true, name: true, email: true } as const
type FriendRow = { id: string; name: string; email: string }
type GroupWithMembers = ShareGroup & { members: (ShareGroupMember & { friend: FriendRow })[] }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function toGroupResponse(group: GroupWithMembers) {
  return { id: group.id, name: group.name, members: group.members.map((member) => member.friend) }
}

async function findGroupWithMembers(groupId: string) {
  return prisma.shareGroup.findUnique({
    where: { id: groupId },
    include: { members: { include: { friend: { select: friendSelect } } } },
  })
}

groupsRouter.get('/', asyncHandler(async (req, res) => {
  const groups = await prisma.shareGroup.findMany({
    where: { ownerId: req.userId },
    include: { members: { include: { friend: { select: friendSelect } } } },
    orderBy: { name: 'asc' },
  })

  res.json(groups.map(toGroupResponse))
}))

groupsRouter.post('/', asyncHandler(async (req, res) => {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { name: rawName } = body as Record<string, unknown>
  if (!isNonEmptyString(rawName)) {
    res.status(400).json({ error: 'name은 필수입니다.' })
    return
  }
  const name = rawName.trim()

  const existing = await prisma.shareGroup.findUnique({
    where: { ownerId_name: { ownerId: req.userId!, name } },
  })
  if (existing) {
    res.status(409).json({ error: '이미 같은 이름의 그룹이 있습니다.' })
    return
  }

  const group = await prisma.shareGroup.create({ data: { ownerId: req.userId!, name } })
  res.status(201).json({ id: group.id, name: group.name, members: [] })
}))

groupsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const existingGroup = await prisma.shareGroup.findUnique({ where: { id: req.params.id } })
  if (!existingGroup || existingGroup.ownerId !== req.userId) {
    res.status(404).json({ error: '존재하지 않는 그룹입니다.' })
    return
  }

  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { name: rawName } = body as Record<string, unknown>
  if (!isNonEmptyString(rawName)) {
    res.status(400).json({ error: 'name은 필수입니다.' })
    return
  }
  const name = rawName.trim()

  const duplicate = await prisma.shareGroup.findUnique({
    where: { ownerId_name: { ownerId: req.userId!, name } },
  })
  if (duplicate && duplicate.id !== existingGroup.id) {
    res.status(409).json({ error: '이미 같은 이름의 그룹이 있습니다.' })
    return
  }

  await prisma.shareGroup.update({ where: { id: existingGroup.id }, data: { name } })
  const updated = await findGroupWithMembers(existingGroup.id)
  res.json(toGroupResponse(updated!))
}))

groupsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const group = await prisma.shareGroup.findUnique({ where: { id: req.params.id } })
  if (!group || group.ownerId !== req.userId) {
    res.status(404).json({ error: '존재하지 않는 그룹입니다.' })
    return
  }

  await prisma.$transaction([
    prisma.shareGroupMember.deleteMany({ where: { groupId: group.id } }),
    prisma.shareGroup.delete({ where: { id: group.id } }),
  ])

  res.status(204).end()
}))

groupsRouter.post('/:id/members', asyncHandler(async (req, res) => {
  const group = await prisma.shareGroup.findUnique({ where: { id: req.params.id } })
  if (!group || group.ownerId !== req.userId) {
    res.status(404).json({ error: '존재하지 않는 그룹입니다.' })
    return
  }

  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { friendUserId } = body as Record<string, unknown>
  if (!isNonEmptyString(friendUserId)) {
    res.status(400).json({ error: 'friendUserId는 필수입니다.' })
    return
  }

  const friendship = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: req.userId!, friendId: friendUserId } },
  })
  if (!friendship) {
    res.status(400).json({ error: '내 친구만 그룹에 추가할 수 있습니다.' })
    return
  }

  const existingMember = await prisma.shareGroupMember.findUnique({
    where: { groupId_friendUserId: { groupId: group.id, friendUserId } },
  })
  if (existingMember) {
    res.status(409).json({ error: '이미 그룹에 속한 친구입니다.' })
    return
  }

  await prisma.shareGroupMember.create({ data: { groupId: group.id, friendUserId } })
  const updated = await findGroupWithMembers(group.id)
  res.json(toGroupResponse(updated!))
}))

groupsRouter.delete('/:id/members/:friendUserId', asyncHandler(async (req, res) => {
  const group = await prisma.shareGroup.findUnique({ where: { id: req.params.id } })
  if (!group || group.ownerId !== req.userId) {
    res.status(404).json({ error: '존재하지 않는 그룹입니다.' })
    return
  }

  const existingMember = await prisma.shareGroupMember.findUnique({
    where: { groupId_friendUserId: { groupId: group.id, friendUserId: req.params.friendUserId } },
  })
  if (!existingMember) {
    res.status(404).json({ error: '그룹에 속하지 않은 친구입니다.' })
    return
  }

  await prisma.shareGroupMember.delete({ where: { id: existingMember.id } })
  const updated = await findGroupWithMembers(group.id)
  res.json(toGroupResponse(updated!))
}))
