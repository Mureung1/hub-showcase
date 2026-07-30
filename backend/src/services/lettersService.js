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

// 사이드바 "모음소에 쌓인 편지" 수. recipientId가 있는 편지(답장)는 특정 수신자에게 직접
// 전달되는 것이라 모음소를 거치지 않으므로 제외한다 — 상태(isMatchable)나 위기 여부와
// 무관하게, 모음소로 보내진 누적 총량을 센다.
export function countPoolLetters() {
  return prisma.letter.count({ where: { recipientId: null } })
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

// 스레드 상세(T12 후속 수정). 원본 편지는 recipientId가 안 채워져 있어서(threadId만 backfill됨),
// "내가 작성했거나 나에게 왔거나" 조건만으로는 답장을 보낸 사람 입장에서 원본 편지가 안 걸린다.
// 그래서 여기선 2단계로 확인한다: ① 클릭한 편지 하나로 "내가 이 스레드에 속해 있는지"만 인가하고,
// ② 통과하면 그 threadId의 편지 전체(원본+답장)를 시간순으로 가져온다. is_mine 계산을 위해
// authorId도 같이 가져오되, 이건 절대 응답 그대로 내보내지 않고 컨트롤러에서 boolean으로만 변환한다.
export async function getThreadLetterForUser(id, userId) {
  const anchor = await prisma.letter.findFirst({
    where: { id, threadId: { not: null }, OR: [{ authorId: userId }, { recipientId: userId }] },
    select: { threadId: true },
  })
  if (!anchor) return null

  return prisma.letter.findMany({
    where: { threadId: anchor.threadId },
    orderBy: { createdAt: 'asc' },
    select: { ...THREAD_LETTER_SELECT, authorId: true },
  })
}

// 왕복 대화 — 스레드 안의 특정 메시지에 답장한다(첫 답장 이후, 두 번째 메시지부터).
// 첫 답장(matchesService.replyToMatch)과 달리 Match가 아니라 "나에게 온 메시지 하나"가
// 기준이다. recipientId가 나인 메시지만 답장 대상이 될 수 있고(= 이미 스레드 안의 메시지라
// threadId도 항상 같이 채워져 있음), 그 메시지에 이미 답장이 달려 있으면 다시 답장할 수 없다.
export async function replyToLetter({ letterId, userId, title, content }) {
  const target = await prisma.letter.findFirst({
    where: { id: letterId, recipientId: userId },
    select: { id: true, authorId: true, threadId: true },
  })
  if (!target) return { notFound: true }

  const existingReply = await prisma.letter.findFirst({ where: { replyToId: target.id } })
  if (existingReply) return { alreadyResolved: true }

  const reply = await prisma.letter.create({
    data: {
      authorId: userId,
      recipientId: target.authorId,
      replyToId: target.id,
      threadId: target.threadId,
      title,
      content,
      envelope: 'basic',
      isMatchable: false,
    },
  })
  return { reply }
}
