// 관리자 화면(재처리·위기 오탐 복구)에서 쓰는 Letter 조회/수정.
// 여기서도 authorId는 select에 넣지 않는다 — 위기 알림용 작성자 식별은 서버 로그
// (recommendationService의 console.error)로만 하고, API 응답에는 안 실어 보낸다.
import { prisma } from '../lib/prisma.js'
import { STALE_PENDING_MINUTES } from '../config/matchingConfig.js'

const ADMIN_LETTER_SELECT = {
  id: true,
  taggingStatus: true,
  taggingAttempts: true,
  taggingError: true,
  createdAt: true,
  riskFlag: true,
  isMatchable: true,
}

export async function listFailedOrStaleTagging() {
  const staleBefore = new Date(Date.now() - STALE_PENDING_MINUTES * 60 * 1000)
  return prisma.letter.findMany({
    where: {
      OR: [
        { taggingStatus: 'failed' },
        { taggingStatus: 'pending', createdAt: { lt: staleBefore } },
      ],
    },
    select: ADMIN_LETTER_SELECT,
    orderBy: { createdAt: 'asc' },
  })
}

export async function getLetterTaggingInfo(id) {
  return prisma.letter.findUnique({ where: { id }, select: ADMIN_LETTER_SELECT })
}

export async function setLetterMatchable(id, isMatchable) {
  return prisma.letter.update({
    where: { id },
    data: { isMatchable },
    select: { id: true, isMatchable: true, riskFlag: true },
  })
}
