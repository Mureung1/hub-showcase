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

function validatePartialSubscriptionInput(body) {
  const errors = []
  const { serviceName, subAmount, billingDay, memberCount, bankName, accountNumber, accountHolderName } = body

  if (serviceName !== undefined && (!serviceName || typeof serviceName !== 'string')) {
    errors.push('serviceName은 필수 문자열입니다.')
  }
  if (subAmount !== undefined && (!Number.isInteger(subAmount) || subAmount <= 0)) {
    errors.push('subAmount는 양의 정수여야 합니다.')
  }
  if (billingDay !== undefined && (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31)) {
    errors.push('billingDay는 1~31 사이의 정수여야 합니다.')
  }
  if (memberCount !== undefined && (!Number.isInteger(memberCount) || memberCount <= 0)) {
    errors.push('memberCount는 양의 정수여야 합니다.')
  }
  if (bankName !== undefined && (!bankName || typeof bankName !== 'string')) {
    errors.push('bankName은 필수 문자열입니다.')
  }
  if (accountNumber !== undefined && (!accountNumber || typeof accountNumber !== 'string')) {
    errors.push('accountNumber는 필수 문자열입니다.')
  }
  if (accountHolderName !== undefined && (!accountHolderName || typeof accountHolderName !== 'string')) {
    errors.push('accountHolderName은 필수 문자열입니다.')
  }

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

router.patch('/:id', requireAuth, async (req, res, next) => {
  const errors = validatePartialSubscriptionInput(req.body)
  if (errors.length > 0) {
    const err = new Error(errors.join(' '))
    err.status = 400
    return next(err)
  }

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
      const err = new Error('파티장만 수정할 수 있습니다.')
      err.status = 403
      return next(err)
    }

    const { serviceName, subAmount, billingDay, memberCount, bankName, accountNumber, accountHolderName } = req.body
    const data = {}
    if (serviceName !== undefined) data.serviceName = serviceName
    if (subAmount !== undefined) data.subAmount = subAmount
    if (billingDay !== undefined) data.billingDay = billingDay
    if (memberCount !== undefined) data.memberCount = memberCount
    if (bankName !== undefined) data.bankName = bankName
    if (accountNumber !== undefined) data.accountNumber = accountNumber
    if (accountHolderName !== undefined) data.accountHolderName = accountHolderName

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data,
    })

    res.status(200).json({
      id: updated.id,
      serviceName: updated.serviceName,
      subAmount: updated.subAmount,
      billingDay: updated.billingDay,
      memberCount: updated.memberCount,
      myAmount: Math.round(updated.subAmount / updated.memberCount),
      ownerId: updated.ownerId,
      joinUrl: `${process.env.FRONTEND_URL}/join/${updated.id}`,
      bankAccount: {
        bankName: updated.bankName,
        accountNumber: updated.accountNumber,
        accountHolderName: updated.accountHolderName,
      },
      createdAt: updated.createdAt,
    })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
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
      const err = new Error('파티장만 삭제할 수 있습니다.')
      err.status = 403
      return next(err)
    }

    await prisma.$transaction([
      prisma.settlementMember.deleteMany({ where: { settlement: { subscriptionId: subscription.id } } }),
      prisma.settlement.deleteMany({ where: { subscriptionId: subscription.id } }),
      prisma.partyMember.deleteMany({ where: { subscriptionId: subscription.id } }),
      prisma.subscription.delete({ where: { id: subscription.id } }),
    ])

    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

export default router
