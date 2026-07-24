import crypto from 'node:crypto'

const DEMO_SEED = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    userId: null,
    rawText: '발표 준비를 어디서 시작해야 할지 몰라 마음이 복잡했다.',
    emotion: '막막함',
    cause: '해야 할 일을 한꺼번에 떠올려 시작점을 정하지 못했다.',
    action: '내일 발표에서 꼭 말할 내용 세 가지만 먼저 적는다.',
    mood: '😞',
    imageUrl: null,
    createdAt: '2026-07-22T11:00:00.000Z',
    updatedAt: '2026-07-22T11:00:00.000Z',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    userId: null,
    rawText: '작은 기능이지만 테스트까지 끝내서 안심됐다.',
    emotion: '안도감',
    cause: '작성한 코드가 기대한 대로 동작하는지 직접 확인했다.',
    action: '다음 기능도 완료 기준을 먼저 한 줄로 적는다.',
    mood: '🙂',
    imageUrl: null,
    createdAt: '2026-07-21T11:00:00.000Z',
    updatedAt: '2026-07-21T11:00:00.000Z',
  },
]

let demoCheckins = []

function copyCheckin(checkin) {
  return { ...checkin }
}

export function resetDemoCheckins(entries = DEMO_SEED) {
  demoCheckins = entries.map(copyCheckin)
}

export async function getDemoCheckins() {
  return demoCheckins.map(copyCheckin)
}

export async function createDemoCheckin(entry) {
  const now = new Date().toISOString()
  const checkin = {
    id: crypto.randomUUID(),
    userId: entry.userId || entry.user_id || null,
    rawText: entry.rawText || entry.raw_text || entry.text,
    emotion: entry.emotion,
    cause: entry.cause,
    action: entry.action,
    mood: entry.mood || null,
    imageUrl: entry.imageUrl || null,
    createdAt: now,
    updatedAt: now,
  }

  demoCheckins.unshift(checkin)
  return copyCheckin(checkin)
}

export async function deleteDemoCheckin(id) {
  const index = demoCheckins.findIndex((checkin) => checkin.id === id)

  if (index === -1) {
    const error = new Error('삭제할 기록을 찾을 수 없습니다.')
    error.status = 404
    throw error
  }

  demoCheckins.splice(index, 1)
}

resetDemoCheckins()
