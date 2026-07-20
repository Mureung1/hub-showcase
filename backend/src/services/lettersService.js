// 편지 관련 DB 접근을 모아두는 서비스 레이어.
// 컨트롤러는 이 함수들만 호출하고, prisma 쿼리는 여기에만 둔다.
import { prisma } from '../lib/prisma.js'

export function createLetter({ title, content, envelope, authorId }) {
  return prisma.letter.create({
    data: { title, content, envelope, authorId },
  })
}

export function listMyLetters(authorId) {
  return prisma.letter.findMany({
    where: { authorId },
    orderBy: { createdAt: 'desc' },
  })
}

// authorId까지 같이 확인해서, 남의 편지를 id만 알아내 조회하는 걸 막는다.
export function getLetterById(id, authorId) {
  return prisma.letter.findFirst({ where: { id, authorId } })
}
