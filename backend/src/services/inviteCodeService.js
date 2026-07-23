import { prisma } from '../config/prismaClient.js'
import { generateInviteCode } from '../utils/inviteCodeUtils.js'

const MAX_RETRY = 5

// DB에 중복되지 않는 초대 코드를 생성해서 반환한다 (최대 5회 재시도)
export async function createUniqueInviteCode() {
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    const code = generateInviteCode()
    const existingUser = await prisma.user.findUnique({ where: { inviteCode: code } })

    if (!existingUser) {
      return code
    }
  }

  console.error(`초대 코드 생성 ${MAX_RETRY}회 재시도 후에도 중복이 발생했습니다.`)
  throw new Error('초대 코드를 생성하지 못했습니다.')
}
