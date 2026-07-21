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

export default router
