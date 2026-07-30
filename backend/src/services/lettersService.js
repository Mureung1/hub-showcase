// 편지 관련 DB 접근을 모아두는 서비스 레이어.
// 컨트롤러는 이 함수들만 호출하고, prisma 쿼리는 여기에만 둔다.
import { prisma } from '../lib/prisma.js'
import { REPLY_DELIVERY_HOURS, SOURCE_READY_DELAY_HOURS } from '../config/matchingConfig.js'

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

// 마지막 편지로부터 SOURCE_READY_DELAY_HOURS(기본 24h)가 안 지났으면 새 편지를 막는다.
// 캘린더 자정 리셋이 아니라 진짜 롤링 시간이다 — "편지 보내고 24시간 타이머가 도는 동안엔
// 로그아웃/새로고침해도 새 편지를 못 보내야 한다"는 요구사항이라, 추천이 준비되는
// 시점(recommendationService.loadReadySourceLetter)과 같은 시계를 공유해야 앞뒤가 맞는다.
export function hasSentLetterWithinDelay(authorId) {
  const cutoff = new Date(Date.now() - SOURCE_READY_DELAY_HOURS * 60 * 60 * 1000)
  return prisma.letter.findFirst({
    where: { authorId, createdAt: { gte: cutoff } },
  })
}

// 저장소 "이어진 편지" 탭(T12). 스레드(threadId)가 있는 편지 중 내가 작성했거나(답장을 보낸 쪽)
// 나에게 온(recipientId, 답장을 받는 쪽) 편지를 찾는다. 상대방이 쓴 편지일 수도 있으므로
// authorId는 select에서 제외해 응답에 절대 안 나가게 한다(익명 원칙, matchesService와 동일 패턴).
const THREAD_LETTER_SELECT = {
  id: true,
  threadId: true,
  title: true,
  content: true,
  createdAt: true,
  deliverAt: true,
}

// 8h 배달 지연(E2) — "이 편지 한 통이 나를 이 스레드의 멤버로 인정해주는가"를 판단하는
// 멤버십 필터(목록 스캔·앵커 인가용). 내가 쓴 건 항상 인정되고, 나에게 온 답장은
// deliverAt이 지나야 인정된다 — 아직 배달 안 된 답장으로는 스레드에 접근할 수 없다.
function deliveredOrMine(userId) {
  return {
    OR: [
      { authorId: userId },
      { recipientId: userId, OR: [{ deliverAt: null }, { deliverAt: { lte: new Date() } }] },
    ],
  }
}

// "이미 멤버로 인가된 스레드 안에서, 개별 메시지 하나하나가 나에게 보여야 하는가"를 판단하는
// 표시 필터(상세 조회용) — deliveredOrMine과 다르다. 원본 편지(deliverAt 없음)는 수신자
// 개념 자체가 없어 스레드 멤버라면 누구에게나 보여야 하고, 내가 쓴 답장은 배달 전에도
// 나에게는 보이며("보내는 중"), 남이 쓴 답장만 배달 전엔 안 보인다.
function visibleToViewer(userId) {
  return {
    OR: [{ authorId: userId }, { deliverAt: null }, { deliverAt: { lte: new Date() } }],
  }
}

export async function listThreadLettersForUser(userId) {
  const letters = await prisma.letter.findMany({
    where: { threadId: { not: null }, ...deliveredOrMine(userId) },
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
// 그래서 여기선 2단계로 확인한다: ① 클릭한 편지 하나로 "내가 이 스레드에 속해 있는지"만
// deliveredOrMine으로 인가하고(아직 나에게 배달 안 된 답장으로는 인가 자체가 안 됨),
// ② 통과하면 그 threadId의 편지 전체를 visibleToViewer로 걸러 가져온다(원본은 항상 보이고,
// 남이 쓴 미배달 답장만 숨김). is_mine 계산을 위해 authorId도 같이 가져오되, 이건 절대
// 응답 그대로 내보내지 않고 컨트롤러에서 boolean으로만 변환한다.
export async function getThreadLetterForUser(id, userId) {
  const anchor = await prisma.letter.findFirst({
    where: { id, threadId: { not: null }, ...deliveredOrMine(userId) },
    select: { threadId: true },
  })
  if (!anchor) return null

  return prisma.letter.findMany({
    where: { threadId: anchor.threadId, ...visibleToViewer(userId) },
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
    select: { id: true, authorId: true, threadId: true, deliverAt: true },
  })
  // 아직 나에게 배달 안 된 메시지는 "존재하지 않는 것"과 동일하게 취급 — URL을 직접 알아내도
  // 답장을 걸 수 없게 방어한다(목록·상세 조회에서 이미 안 보이는 것과 일관된 규칙).
  if (!target || (target.deliverAt && target.deliverAt > new Date())) {
    return { notFound: true }
  }

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
      deliverAt: new Date(Date.now() + REPLY_DELIVERY_HOURS * 60 * 60 * 1000),
    },
  })
  return { reply }
}
