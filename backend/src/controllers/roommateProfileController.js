import { prisma } from '../config/prismaClient.js'

const VALID_ROOMMATE_TYPES = ['friend', 'business']

// 룸메이트 유형 저장: user_id가 unique 컬럼이므로 이미 있으면 갱신, 없으면 새로 생성
export async function submitRoommateProfile(req, res) {
  try {
    const { roommateType } = req.body
    const userId = req.user.userId

    if (!roommateType || !VALID_ROOMMATE_TYPES.includes(roommateType)) {
      return res.status(400).json({ message: '룸메이트 유형을 선택해주세요.' })
    }

    const result = await prisma.roommateProfile.upsert({
      where: { userId: BigInt(userId) },
      update: { roommateType },
      create: { userId: BigInt(userId), roommateType },
    })

    return res.status(200).json({
      profileId: result.profileId.toString(),
      roommateType: result.roommateType,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: '룸메이트 유형 저장 중 오류가 발생했습니다.' })
  }
}
