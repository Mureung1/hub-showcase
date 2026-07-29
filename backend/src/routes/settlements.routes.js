import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { decrypt } from '../lib/crypto.js'

function isUniqueConstraintError(error) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

const router = Router()

function currentBillingMonth() {
  return new Date().toISOString().slice(0, 7)
}

function buildTransferLink({ amount, bankName, accountNumber }) {
  return `supertoss://send?bank=${encodeURIComponent(bankName)}&accountNo=${accountNumber}&amount=${amount}`
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
      const err = new Error('이번 달 정산이 이미 존재합니다.')
      err.status = 409
      return next(err)
    }

    const partyMembers = await prisma.partyMember.findMany({
      where: { subscriptionId: subscription.id },
      include: { user: true },
    })

    if (partyMembers.length === 0) {
      const err = new Error('정산할 파티원이 없습니다.')
      err.status = 400
      return next(err)
    }

    const amount = Math.round(subscription.subAmount / subscription.memberCount)

    let settlement
    try {
      settlement = await prisma.settlement.create({
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
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        const err = new Error('이번 달 정산이 이미 존재합니다.')
        err.status = 409
        return next(err)
      }
      throw e
    }

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
          accountNumber: decrypt(subscription.accountNumber),
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
        myReportedAt: settlement.members[0].reportedAt,
        mySettlementMemberId: settlement.members[0].id,
        myTransferLink: buildTransferLink({
          amount: settlement.members[0].amount,
          bankName: subscription.bankName,
          accountNumber: decrypt(subscription.accountNumber),
        }),
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
            accountNumber: decrypt(subscription.accountNumber),
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
      const err = new Error('본인 항목만 요청할 수 있습니다.')
      err.status = 403
      return next(err)
    }

    if (settlementMember.status === 'done') {
      const err = new Error('이미 이체 확인 처리된 항목입니다.')
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

router.delete('/:id/settlements/:settlementId', requireAuth, async (req, res, next) => {
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

    const settlement = await prisma.settlement.findUnique({
      where: { id: req.params.settlementId },
      include: { members: true },
    })

    if (!settlement || settlement.subscriptionId !== subscription.id) {
      const err = new Error('존재하지 않는 정산입니다.')
      err.status = 404
      return next(err)
    }

    if (settlement.members.some((member) => member.status === 'done')) {
      const err = new Error('이미 확인 완료된 파티원이 있어 삭제할 수 없습니다.')
      err.status = 409
      return next(err)
    }

    await prisma.$transaction([
      prisma.settlementMember.deleteMany({ where: { settlementId: settlement.id } }),
      prisma.settlement.delete({ where: { id: settlement.id } }),
    ])

    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

export default router
