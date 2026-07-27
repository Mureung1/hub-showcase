// Match 테이블에 대한 모든 Prisma 쿼리를 여기에 모은다.
// 매칭된 편지(matchedLetter)를 읽을 때는 항상 select로 authorId를 제외해서,
// "응답에 작성자를 역추적할 수 있는 정보가 나가면 안 된다"는 원칙을 쿼리 단계부터 강제한다.
import { prisma } from '../lib/prisma.js'
import { CACHE_TTL_DAYS } from '../config/matchingConfig.js'

const MATCHED_LETTER_SELECT = { id: true, content: true, createdAt: true, isMatchable: true }

class ExposureSaturatedError extends Error {}

export async function findActiveMatch(sourceLetterId) {
  return prisma.match.findFirst({
    where: {
      sourceLetterId,
      status: { in: ['recommended', 'opened'] },
      expiresAt: { gt: new Date() },
      matchedLetter: { isMatchable: true },
    },
    include: { matchedLetter: { select: MATCHED_LETTER_SELECT } },
    orderBy: { createdAt: 'desc' },
  })
}

// 의도적으로 생략한 것: source별 advisory lock으로 "동시 요청 시 중복 AI 호출 자체를 줄이는"
// 최적화(계획서 17-a에서 제안). DATABASE_URL이 pgBouncer 트랜잭션 풀링 모드(?pgbouncer=true)를
// 쓰는데, 이 모드에서는 세션 단위 advisory lock이 안전하게 동작하지 않을 수 있어서, 어설프게
// 넣으면 지금의 정합성 보장(중복 Match 없음)보다 위험한 버그가 될 수 있다. 정합성은 아래
// 부분 유니크 인덱스만으로 이미 완전히 보장되므로(동시 5개 요청 테스트로 확인함), 이 최적화는
// 필요성이 커지면 DIRECT_URL(세션 모드) 기반으로 별도로 설계해서 추가한다.

// 조건부 노출 증가 + Match 삽입을 한 트랜잭션으로 묶는다(계획서 17-a 참고).
// - effectiveExposureCap이 있으면 "matchExposureCount < cap"을 만족할 때만 증가시키고,
//   그 사이 포화됐으면(동시 요청 경쟁) 트랜잭션 전체를 롤백해 { saturated: true }를 반환한다.
// - (sourceLetterId) 부분 유니크 인덱스 충돌(동시에 같은 source에 active match 2개 생성 시도)이
//   나면 트랜잭션이 롤백되고, 바깥에서 승자를 다시 조회해 { conflict: true, winner } 를 반환한다.
// - AI 호출은 이 함수 호출 전에 이미 끝나 있어야 한다 — 트랜잭션 안에 넣지 않는다.
export async function createMatchAtomic({
  sourceLetterId,
  matchedLetterId,
  reason,
  candidateCount,
  candidateSnapshot,
  matchPromptVersion,
  effectiveExposureCap,
}) {
  try {
    const match = await prisma.$transaction(async (tx) => {
      if (effectiveExposureCap != null) {
        const result = await tx.letter.updateMany({
          where: { id: matchedLetterId, matchExposureCount: { lt: effectiveExposureCap } },
          data: { matchExposureCount: { increment: 1 } },
        })
        if (result.count === 0) {
          throw new ExposureSaturatedError()
        }
      } else {
        await tx.letter.update({
          where: { id: matchedLetterId },
          data: { matchExposureCount: { increment: 1 } },
        })
      }

      const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000)

      return tx.match.create({
        data: {
          sourceLetterId,
          matchedLetterId,
          reason,
          candidateCount,
          candidateSnapshot,
          matchPromptVersion,
          expiresAt,
        },
        include: { matchedLetter: { select: MATCHED_LETTER_SELECT } },
      })
    })
    return { match }
  } catch (err) {
    if (err instanceof ExposureSaturatedError) {
      return { saturated: true }
    }
    if (err.code === 'P2002') {
      const winner = await findActiveMatch(sourceLetterId)
      return { conflict: true, winner }
    }
    throw err
  }
}

// PATCH /api/matches/:id 에서 "이 match의 source 편지가 호출자 소유인지" 확인용.
// 존재 여부와 소유권 확인을 쿼리 하나로 합쳐서, 남의 match id를 넣어봐도 404와 동일하게 처리한다.
export async function findMatchOwnedByUser(matchId, userId) {
  return prisma.match.findFirst({
    where: { id: matchId, sourceLetter: { authorId: userId } },
    include: { matchedLetter: { select: MATCHED_LETTER_SELECT } },
  })
}

export async function setStatus(matchId, status) {
  return prisma.match.update({
    where: { id: matchId },
    data: { status, ...(status === 'opened' ? { openedAt: new Date() } : {}) },
    include: { matchedLetter: { select: MATCHED_LETTER_SELECT } },
  })
}

export async function dismissActive(sourceLetterId) {
  return prisma.match.updateMany({
    where: { sourceLetterId, status: { in: ['recommended', 'opened'] } },
    data: { status: 'dismissed' },
  })
}

// 사용자별 레이트리밋 집계용(Phase 10). Redis 없이 Match 테이블 count로 충분한 규모라고 판단했다.
export async function countRecentMatchesForUser(userId, since) {
  return prisma.match.count({
    where: { sourceLetter: { authorId: userId }, createdAt: { gte: since } },
  })
}

// refresh는 항상 기존 match를 dismissed로 바꾼 뒤 새로 생성하므로, "언제 dismissed로 바뀌었는지"
// (updatedAt)를 기준으로 오늘 몇 번 refresh했는지 센다.
export async function countRecentRefreshesForUser(userId, since) {
  return prisma.match.count({
    where: { sourceLetter: { authorId: userId }, status: 'dismissed', updatedAt: { gte: since } },
  })
}
