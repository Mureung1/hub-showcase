// 편지 관련 DB 접근을 모아두는 서비스 레이어.
// 컨트롤러는 이 함수들만 호출하고, prisma 쿼리는 여기에만 둔다.
import { prisma } from '../lib/prisma.js'

// 오늘은 로그인이 없어 작성자를 고정 익명값으로 다룬다.
const ANON_AUTHOR_ID = 'anon'

export function createLetter({ title, content, envelope }) {
  return prisma.letter.create({
    data: { title, content, envelope, authorId: ANON_AUTHOR_ID },
  })
}

export function listMyLetters() {
  return prisma.letter.findMany({
    where: { authorId: ANON_AUTHOR_ID },
    orderBy: { createdAt: 'desc' },
  })
}

export function getLetterById(id) {
  return prisma.letter.findUnique({ where: { id } })
}
