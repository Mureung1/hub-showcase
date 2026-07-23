import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'

const router = Router()

function validateSubscriptionInput(body) {
  const errors = []
  const { serviceName, subAmount, billingDay, memberCount, bankName, accountNumber, accountHolderName } = body

  if (!serviceName || typeof serviceName !== 'string') errors.push('serviceName은 필수 문자열입니다.')
  if (!Number.isInteger(subAmount) || subAmount <= 0) errors.push('subAmount는 양의 정수여야 합니다.')
  if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31) errors.push('billingDay는 1~31 사이의 정수여야 합니다.')
  if (!Number.isInteger(memberCount) || memberCount <= 0) errors.push('memberCount는 양의 정수여야 합니다.')
  if (!bankName || typeof bankName !== 'string') errors.push('bankName은 필수 문자열입니다.')
  if (!accountNumber || typeof accountNumber !== 'string') errors.push('accountNumber는 필수 문자열입니다.')
  if (!accountHolderName || typeof accountHolderName !== 'string') errors.push('accountHolderName은 필수 문자열입니다.')

  return errors
}

router.post('/', requireAuth, async (req, res, next) => {
  const errors = validateSubscriptionInput(req.body)
  if (errors.length > 0) {
    const err = new Error(errors.join(' '))
    err.status = 400
    return next(err)
  }

  const { serviceName, subAmount, billingDay, memberCount, bankName, accountNumber, accountHolderName } = req.body

  try {
    const subscription = await prisma.subscription.create({
      data: {
        serviceName,
        subAmount,
        billingDay,
        memberCount,
        bankName,
        accountNumber,
        accountHolderName,
        ownerId: req.user.id,
      },
    })

    res.status(201).json({
      id: subscription.id,
      serviceName: subscription.serviceName,
      subAmount: subscription.subAmount,
      billingDay: subscription.billingDay,
      memberCount: subscription.memberCount,
      myAmount: Math.round(subscription.subAmount / subscription.memberCount),
      ownerId: subscription.ownerId,
      joinUrl: `${process.env.FRONTEND_URL}/join/${subscription.id}`,
      bankAccount: {
        bankName: subscription.bankName,
        accountNumber: subscription.accountNumber,
        accountHolderName: subscription.accountHolderName,
      },
      createdAt: subscription.createdAt,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { members: { some: { userId: req.user.id } } },
        ],
      },
    })

    res.status(200).json({
      items: subscriptions.map((subscription) => ({
        id: subscription.id,
        serviceName: subscription.serviceName,
        billingDay: subscription.billingDay,
        memberCount: subscription.memberCount,
        myAmount: Math.round(subscription.subAmount / subscription.memberCount),
        role: subscription.ownerId === req.user.id ? 'owner' : 'member',
      })),
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: req.params.id },
    })

    if (!subscription) {
      const err = new Error('존재하지 않는 파티입니다.')
      err.status = 404
      return next(err)
    }

    let role
    if (subscription.ownerId === req.user.id) {
      role = 'owner'
    } else {
      const membership = await prisma.partyMember.findUnique({
        where: {
          subscriptionId_userId: {
            subscriptionId: subscription.id,
            userId: req.user.id,
          },
        },
      })
      if (!membership) {
        const err = new Error('파티장 또는 파티원만 조회할 수 있습니다.')
        err.status = 403
        return next(err)
      }
      role = 'member'
    }

    const response = {
      id: subscription.id,
      serviceName: subscription.serviceName,
      subAmount: subscription.subAmount,
      billingDay: subscription.billingDay,
      memberCount: subscription.memberCount,
      myAmount: Math.round(subscription.subAmount / subscription.memberCount),
      ownerId: subscription.ownerId,
      role,
      createdAt: subscription.createdAt,
    }

    if (role === 'owner') {
      response.joinUrl = `${process.env.FRONTEND_URL}/join/${subscription.id}`
      response.bankAccount = {
        bankName: subscription.bankName,
        accountNumber: subscription.accountNumber,
        accountHolderName: subscription.accountHolderName,
      }
    }

    res.status(200).json(response)
  } catch (e) {
    next(e)
  }
})

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

export default router
