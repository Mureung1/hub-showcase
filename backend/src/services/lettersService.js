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

// 오늘(자정 기준, 서버 로컬 타임존) 이미 쓴 편지가 있는지 확인한다 — 하루 1편 제한
// (docs/plan.md 서비스 규칙: "하루에 한 번만 편지 작성 가능").
export function hasLetterToday(authorId) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return prisma.letter.findFirst({
    where: { authorId, createdAt: { gte: startOfToday } },
  })
}

// 저장소 "이어진 편지" 탭(T12). 스레드(threadId)가 있는 편지 중 내가 작성했거나(답장을 보낸 쪽)
// 나에게 온(recipientId, 답장을 받는 쪽) 편지를 찾는다. 상대방이 쓴 편지일 수도 있으므로
// authorId는 select에서 제외해 응답에 절대 안 나가게 한다(익명 원칙, matchesService와 동일 패턴).
const THREAD_LETTER_SELECT = { id: true, threadId: true, title: true, content: true, createdAt: true }

export async function listThreadLettersForUser(userId) {
  const letters = await prisma.letter.findMany({
    where: { threadId: { not: null }, OR: [{ authorId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: 'desc' },
    select: THREAD_LETTER_SELECT,
  })

  // 한 스레드(threadId)에 원본 편지·답장 편지 둘 다 나(작성자 또는 수신자)와 연결될 수 있어서,
  // 목록에는 스레드당 가장 최근 편지 하나만 남긴다(createdAt desc라 먼저 나온 게 최신).
  const seen = new Set()
  return letters.filter((letter) => {
    if (seen.has(letter.threadId)) return false
    seen.add(letter.threadId)
    return true
  })
}

export function getThreadLetterForUser(id, userId) {
  return prisma.letter.findFirst({
    where: { id, threadId: { not: null }, OR: [{ authorId: userId }, { recipientId: userId }] },
    select: THREAD_LETTER_SELECT,
  })
}
