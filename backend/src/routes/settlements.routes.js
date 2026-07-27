import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'

const router = Router()

function currentBillingMonth() {
  return new Date().toISOString().slice(0, 7)
}

function buildTransferLink({ amount, bankName, accountNumber }) {
  return `supertoss://send?amount=${amount}&bank=${encodeURIComponent(bankName)}&accountno=${accountNumber}`
}

router.post('/:id/settlements', requireAuth, async (req, res, next) => {
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
      const err = new Error('파티장만 정산을 생성할 수 있습니다.')
      err.status = 403
      return next(err)
    }

    const billingMonth = currentBillingMonth()

    const existing = await prisma.settlement.findUnique({
      where: {
        subscriptionId_billingMonth: {
          subscriptionId: subscription.id,
          billingMonth,
        },
      },
    })

    if (existing) {
      const err = new Error('이번 달 정산이 이미 생성되어 있습니다.')
      err.status = 409
      return next(err)
    }

    const partyMembers = await prisma.partyMember.findMany({
      where: { subscriptionId: subscription.id },
      include: { user: true },
    })

    const amount = Math.round(subscription.subAmount / subscription.memberCount)

    const settlement = await prisma.settlement.create({
      data: {
        subscriptionId: subscription.id,
        billingMonth,
        members: {
          create: partyMembers.map((partyMember) => ({
            userId: partyMember.userId,
            name: partyMember.user.username,
            amount,
          })),
        },
      },
      include: { members: true },
    })

    res.status(201).json({
      id: settlement.id,
      subscriptionId: settlement.subscriptionId,
      billingMonth: settlement.billingMonth,
      members: settlement.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        name: member.name,
        amount: member.amount,
        status: member.status,
        doneAt: member.doneAt,
        reportedAt: member.reportedAt,
        transferLink: buildTransferLink({
          amount: member.amount,
          bankName: subscription.bankName,
          accountNumber: subscription.accountNumber,
        }),
      })),
      createdAt: settlement.createdAt,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id/settlements', requireAuth, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: req.params.id },
    })

    if (!subscription) {
      const err = new Error('존재하지 않는 파티입니다.')
      err.status = 404
      return next(err)
    }

    const isOwner = subscription.ownerId === req.user.id

    if (isOwner) {
      const settlements = await prisma.settlement.findMany({
        where: { subscriptionId: subscription.id },
        include: { members: true },
        orderBy: { createdAt: 'desc' },
      })

      return res.status(200).json({
        items: settlements.map((settlement) => ({
          id: settlement.id,
          billingMonth: settlement.billingMonth,
          memberCount: settlement.members.length,
          doneCount: settlement.members.filter((member) => member.status === 'done').length,
          createdAt: settlement.createdAt,
        })),
      })
    }

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

    const settlements = await prisma.settlement.findMany({
      where: { subscriptionId: subscription.id, members: { some: { userId: req.user.id } } },
      include: { members: { where: { userId: req.user.id } } },
      orderBy: { createdAt: 'desc' },
    })

    res.status(200).json({
      items: settlements.map((settlement) => ({
        id: settlement.id,
        billingMonth: settlement.billingMonth,
        myAmount: settlement.members[0].amount,
        myStatus: settlement.members[0].status,
        createdAt: settlement.createdAt,
      })),
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id/settlements/:settlementId', requireAuth, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: req.params.id },
    })

    if (!subscription) {
      const err = new Error('존재하지 않는 파티입니다.')
      err.status = 404
      return next(err)
    }

    const settlement = await prisma.settlement.findUnique({
      where: { id: req.params.settlementId },
      include: { members: true },
    })

    if (!settlement || settlement.subscriptionId !== subscription.id) {
      const err = new Error('존재하지 않는 정산입니다.')
      err.status = 404
      return next(err)
    }

    const isOwner = subscription.ownerId === req.user.id

    if (isOwner) {
      return res.status(200).json({
        id: settlement.id,
        subscriptionId: settlement.subscriptionId,
        billingMonth: settlement.billingMonth,
        role: 'owner',
        members: settlement.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          name: member.name,
          amount: member.amount,
          status: member.status,
          doneAt: member.doneAt,
          reportedAt: member.reportedAt,
        })),
        createdAt: settlement.createdAt,
      })
    }

    const membership = await prisma.partyMember.findUnique({
      where: {
        subscriptionId_userId: {
          subscriptionId: subscription.id,
          userId: req.user.id,
        },
      },
    })

    const myMember = settlement.members.find((member) => member.userId === req.user.id)

    if (!membership || !myMember) {
      const err = new Error('파티장 또는 현재 파티원만 조회할 수 있습니다.')
      err.status = 403
      return next(err)
    }

    res.status(200).json({
      id: settlement.id,
      subscriptionId: settlement.subscriptionId,
      billingMonth: settlement.billingMonth,
      role: 'member',
      members: [
        {
          id: myMember.id,
          userId: myMember.userId,
          name: myMember.name,
          amount: myMember.amount,
          status: myMember.status,
          doneAt: myMember.doneAt,
          reportedAt: myMember.reportedAt,
          transferLink: buildTransferLink({
            amount: myMember.amount,
            bankName: subscription.bankName,
            accountNumber: subscription.accountNumber,
          }),
        },
      ],
      createdAt: settlement.createdAt,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/settlements/:settlementId/members/:settlementMemberId/report', requireAuth, async (req, res, next) => {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id: req.params.settlementId },
    })

    if (!settlement || settlement.subscriptionId !== req.params.id) {
      const err = new Error('존재하지 않는 정산입니다.')
      err.status = 404
      return next(err)
    }

    const settlementMember = await prisma.settlementMember.findUnique({
      where: { id: req.params.settlementMemberId },
    })

    if (!settlementMember || settlementMember.settlementId !== settlement.id) {
      const err = new Error('존재하지 않는 정산 항목입니다.')
      err.status = 404
      return next(err)
    }

    if (settlementMember.userId !== req.user.id) {
      const err = new Error('본인 항목만 신고할 수 있습니다.')
      err.status = 403
      return next(err)
    }

    if (settlementMember.status === 'done') {
      const err = new Error('이미 정산완료 처리된 항목입니다.')
      err.status = 409
      return next(err)
    }

    const updated = await prisma.settlementMember.update({
      where: { id: settlementMember.id },
      data: { reportedAt: new Date() },
    })

    res.status(200).json({
      id: updated.id,
      status: updated.status,
      reportedAt: updated.reportedAt,
    })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id/settlements/:settlementId/members/:settlementMemberId', requireAuth, async (req, res, next) => {
  const { status } = req.body

  if (status !== 'pending' && status !== 'done') {
    const err = new Error('status는 pending 또는 done이어야 합니다.')
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
      const err = new Error('파티장만 상태를 변경할 수 있습니다.')
      err.status = 403
      return next(err)
    }

    const settlement = await prisma.settlement.findUnique({
      where: { id: req.params.settlementId },
    })

    if (!settlement || settlement.subscriptionId !== subscription.id) {
      const err = new Error('존재하지 않는 정산입니다.')
      err.status = 404
      return next(err)
    }

    const settlementMember = await prisma.settlementMember.findUnique({
      where: { id: req.params.settlementMemberId },
    })

    if (!settlementMember || settlementMember.settlementId !== settlement.id) {
      const err = new Error('존재하지 않는 정산 항목입니다.')
      err.status = 404
      return next(err)
    }

    const updated = await prisma.settlementMember.update({
      where: { id: settlementMember.id },
      data: {
        status,
        doneAt: status === 'done' ? new Date() : null,
        reportedAt: null,
      },
    })

    res.status(200).json({
      id: updated.id,
      status: updated.status,
      doneAt: updated.doneAt,
      reportedAt: updated.reportedAt,
    })
  } catch (e) {
    next(e)
  }
})

export default router
