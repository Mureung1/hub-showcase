import { indexedDB } from 'fake-indexeddb'
import { beforeEach, describe, expect, test } from 'vitest'
import { createGuestCheckinRepository } from './guestCheckinRepository'

let repository
let databaseName
let nextId
let currentTime

function sampleCheckin(overrides = {}) {
  return {
    rawText: '오늘은 발표 준비가 막막했다.',
    mood: '😐',
    imageUrl: null,
    emotion: '막막함',
    cause: '발표 준비의 시작점을 찾기 어려움',
    action: '목차를 세 줄로 적기',
    ...overrides,
  }
}

beforeEach(() => {
  databaseName = `haru-checkout-test-${Math.random()}`
  nextId = 1
  currentTime = new Date('2026-07-27T01:00:00.000Z')
  repository = createGuestCheckinRepository({
    indexedDBFactory: indexedDB,
    dbName: databaseName,
    now: () => currentTime,
    createId: () => `guest-${nextId++}`,
  })
})

describe('게스트 체크인 저장소', () => {
  test('기록을 IndexedDB에 저장하고 새로운 저장소 인스턴스에서도 복원한다', async () => {
    const saved = await repository.createCheckin(sampleCheckin())
    const reopenedRepository = createGuestCheckinRepository({
      indexedDBFactory: indexedDB,
      dbName: databaseName,
    })

    expect(saved).toMatchObject({
      id: 'guest-1',
      rawText: '오늘은 발표 준비가 막막했다.',
      storageMode: 'guest',
    })
    await expect(reopenedRepository.getCheckins()).resolves.toEqual([saved])
  })

  test('기록은 생성 시각이 최신인 순서로 조회한다', async () => {
    await repository.createCheckin(sampleCheckin({ emotion: '첫 기록' }))
    currentTime = new Date('2026-07-27T02:00:00.000Z')
    await repository.createCheckin(sampleCheckin({ emotion: '두 번째 기록' }))

    const records = await repository.getCheckins()

    expect(records.map((record) => record.emotion)).toEqual(['두 번째 기록', '첫 기록'])
  })

  test('개별 기록을 삭제한다', async () => {
    const saved = await repository.createCheckin(sampleCheckin())

    await repository.deleteCheckin(saved.id)

    await expect(repository.getCheckins()).resolves.toEqual([])
  })

  test('게스트 기록을 모두 삭제한다', async () => {
    await repository.createCheckin(sampleCheckin())
    await repository.createCheckin(sampleCheckin({ emotion: '다른 기록' }))

    await repository.clearCheckins()

    await expect(repository.getCheckins()).resolves.toEqual([])
  })

  test('사진 데이터 URL도 기록과 함께 기기에 저장한다', async () => {
    const imageUrl = 'data:image/png;base64,aGFydQ=='

    const saved = await repository.createCheckin(sampleCheckin({ imageUrl }))

    expect(saved.imageUrl).toBe(imageUrl)
    await expect(repository.getCheckins()).resolves.toEqual([saved])
  })
})
