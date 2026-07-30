import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { encrypt, decrypt } from '../lib/crypto.js'

const router = Router()

const SERVICE_NAME_MAX_LENGTH = 50
const BANK_NAME_MAX_LENGTH = 30
const ACCOUNT_NUMBER_MAX_LENGTH = 30
const ACCOUNT_NUMBER_PATTERN = /^[0-9-]+$/

function validateSubscriptionInput(body) {
  const errors = []
  const { serviceName, subAmount, billingDay, memberCount, bankName, accountNumber } = body

  if (!serviceName || typeof serviceName !== 'string') errors.push('serviceName은 필수 문자열입니다.')
  else if (serviceName.length > SERVICE_NAME_MAX_LENGTH) errors.push(`serviceName은 ${SERVICE_NAME_MAX_LENGTH}자 이하여야 합니다.`)
  if (!Number.isInteger(subAmount) || subAmount <= 0) errors.push('subAmount는 양의 정수여야 합니다.')
  if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31) errors.push('billingDay는 1~31 사이의 정수여야 합니다.')
  if (!Number.isInteger(memberCount) || memberCount <= 0) errors.push('memberCount는 양의 정수여야 합니다.')
  if (!bankName || typeof bankName !== 'string') errors.push('bankName은 필수 문자열입니다.')
  else if (bankName.length > BANK_NAME_MAX_LENGTH) errors.push(`bankName은 ${BANK_NAME_MAX_LENGTH}자 이하여야 합니다.`)
  if (!accountNumber || typeof accountNumber !== 'string') errors.push('accountNumber는 필수 문자열입니다.')
  else if (accountNumber.length > ACCOUNT_NUMBER_MAX_LENGTH || !ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
    errors.push(`accountNumber는 ${ACCOUNT_NUMBER_MAX_LENGTH}자 이하의 숫자/하이픈 조합이어야 합니다.`)
  }

  return errors
}

function validatePartialSubscriptionInput(body) {
  const errors = []
  const { serviceName, subAmount, billingDay, memberCount, bankName, accountNumber } = body

  if (serviceName !== undefined) {
    if (!serviceName || typeof serviceName !== 'string') errors.push('serviceName은 필수 문자열입니다.')
    else if (serviceName.length > SERVICE_NAME_MAX_LENGTH) errors.push(`serviceName은 ${SERVICE_NAME_MAX_LENGTH}자 이하여야 합니다.`)
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
  if (bankName !== undefined) {
    if (!bankName || typeof bankName !== 'string') errors.push('bankName은 필수 문자열입니다.')
    else if (bankName.length > BANK_NAME_MAX_LENGTH) errors.push(`bankName은 ${BANK_NAME_MAX_LENGTH}자 이하여야 합니다.`)
  }
  if (accountNumber !== undefined) {
    if (!accountNumber || typeof accountNumber !== 'string') errors.push('accountNumber는 필수 문자열입니다.')
    else if (accountNumber.length > ACCOUNT_NUMBER_MAX_LENGTH || !ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
      errors.push(`accountNumber는 ${ACCOUNT_NUMBER_MAX_LENGTH}자 이하의 숫자/하이픈 조합이어야 합니다.`)
    }
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

  const { serviceName, subAmount, billingDay, memberCount, bankName, accountNumber } = req.body

  try {
    const subscription = await prisma.subscription.create({
      data: {
        serviceName,
        subAmount,
        billingDay,
        memberCount,
        bankName,
        accountNumber: encrypt(accountNumber),
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
        accountNumber,
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
      orderBy: [
        { billingDay: 'asc' },
        { serviceName: 'asc' },
      ],
    })

    res.status(200).json({
      items: subscriptions.map((subscription) => ({
        id: subscription.id,
        serviceName: subscription.serviceName,
        billingDay: subscription.billingDay,
        memberCount: subscription.memberCount,
        myAmount: Math.round(subscription.subAmount / subscription.memberCount),
        role: subscription.ownerId === req.user.id ? 'owner' : 'member',
        createdAt: subscription.createdAt,
      })),
    })
  } catch (e) {
    next(e)
  }
})

// /:id 보다 먼저 등록해야 함 — 그렇지 않으면 'dashboard'가 :id로 매칭됨
router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const month = typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : new Date().toISOString().slice(0, 7)

    const [year, monthNum] = month.split('-').map(Number)
    const monthEnd = new Date(year, monthNum, 1)

    const subscriptions = await prisma.subscription.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { members: { some: { userId: req.user.id } } },
        ],
        createdAt: { lt: monthEnd },
      },
    })

    const totals = subscriptions.reduce(
      (acc, subscription) => {
        acc.totalSubAmount += subscription.subAmount
        acc.totalMyAmount += Math.round(subscription.subAmount / subscription.memberCount)
        return acc
      },
      { totalSubAmount: 0, totalMyAmount: 0 },
    )

    res.status(200).json({
      month,
      totalSubAmount: totals.totalSubAmount,
      totalMyAmount: totals.totalMyAmount,
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
        accountNumber: decrypt(subscription.accountNumber),
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

    const { serviceName, subAmount, billingDay, memberCount, bankName, accountNumber } = req.body

    if (memberCount !== undefined) {
      const currentMemberCount = await prisma.partyMember.count({
        where: { subscriptionId: subscription.id },
      })

      if (memberCount < currentMemberCount + 1) {
        const err = new Error('가입한 파티원 수보다 적게 설정할 수 없습니다.')
        err.status = 400
        return next(err)
      }
    }
    const data = {}
    if (serviceName !== undefined) data.serviceName = serviceName
    if (subAmount !== undefined) data.subAmount = subAmount
    if (billingDay !== undefined) data.billingDay = billingDay
    if (memberCount !== undefined) data.memberCount = memberCount
    if (bankName !== undefined) data.bankName = bankName
    if (accountNumber !== undefined) data.accountNumber = encrypt(accountNumber)

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
        accountNumber: decrypt(updated.accountNumber),
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
