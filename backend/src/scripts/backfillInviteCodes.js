// 1회성 스크립트: inviteCode가 비어있는 기존 유저 전원에게 고유한 초대 코드를 발급한다
// 실행: node src/scripts/backfillInviteCodes.js
import { prisma } from '../config/prismaClient.js'
import { createUniqueInviteCode } from '../services/inviteCodeService.js'

async function backfillInviteCodes() {
  const usersWithoutCode = await prisma.user.findMany({
    where: { inviteCode: null },
  })

  console.log(`초대 코드가 없는 유저 ${usersWithoutCode.length}명 발견`)

  for (const user of usersWithoutCode) {
    const inviteCode = await createUniqueInviteCode()

    await prisma.user.update({
      where: { userId: user.userId },
      data: { inviteCode },
    })

    console.log(`userId=${user.userId} username=${user.username} -> inviteCode=${inviteCode}`)
  }

  console.log('초대 코드 일괄 발급 완료')
}

backfillInviteCodes()
  .catch((err) => {
    console.error('초대 코드 일괄 발급 중 오류가 발생했습니다:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
