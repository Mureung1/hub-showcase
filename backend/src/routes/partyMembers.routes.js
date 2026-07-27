import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'

const router = Router()

router.get('/:id/preview', async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      select: { id: true, serviceName: true },
    })

    if (!subscription) {
      const err = new Error('존재하지 않는 파티입니다.')
      err.status = 404
      return next(err)
    }

    res.status(200).json(subscription)
  } catch (e) {
    next(e)
  }
})

router.post('/:id/join', requireAuth, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: req.params.id },
    })

    if (!subscription) {
      const err = new Error('존재하지 않는 파티입니다.')
      err.status = 404
      return next(err)
    }

    const existingMembership = await prisma.partyMember.findUnique({
      where: {
        subscriptionId_userId: {
          subscriptionId: subscription.id,
          userId: req.user.id,
        },
      },
    })

    if (existingMembership) {
      const err = new Error('이미 파티원으로 등록되어 있습니다.')
      err.status = 409
      return next(err)
    }

    const member = await prisma.partyMember.create({
      data: {
        subscriptionId: subscription.id,
        userId: req.user.id,
      },
    })

    res.status(201).json({
      memberId: member.id,
      subscriptionId: member.subscriptionId,
      userId: member.userId,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id/members', requireAuth, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: req.params.id },
    })

    if (!subscription) {
      const err = new Error('존재하지 않는 파티입니다.')
      err.status = 404
      return next(err)
    }

    if (subscription.ownerId !== req.user.id) {
      const err = new Error('파티장만 조회할 수 있습니다.')
      err.status = 403
      return next(err)
    }

    const members = await prisma.partyMember.findMany({
      where: { subscriptionId: subscription.id },
      include: { user: true },
    })

    res.status(200).json({
      items: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        name: member.user.username,
        joinedAt: member.joinedAt,
      })),
    })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id/members/:memberId', requireAuth, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: req.params.id },
    })

    if (!subscription) {
      const err = new Error('존재하지 않는 파티입니다.')
      err.status = 404
      return next(err)
    }

    const member = await prisma.partyMember.findUnique({
      where: { id: req.params.memberId },
    })

    if (!member || member.subscriptionId !== subscription.id) {
      const err = new Error('존재하지 않는 파티원입니다.')
      err.status = 404
      return next(err)
    }

    const isOwner = subscription.ownerId === req.user.id
    const isSelf = member.userId === req.user.id

    if (!isOwner && !isSelf) {
      const err = new Error('파티장 또는 본인만 삭제할 수 있습니다.')
      err.status = 403
      return next(err)
    }

    await prisma.partyMember.delete({ where: { id: member.id } })

    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

export default router
