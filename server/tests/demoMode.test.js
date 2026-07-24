import test from 'node:test'
import assert from 'node:assert/strict'
import { isDemoMode } from '../config/runtimeMode.js'
import {
  createDemoCheckin,
  deleteDemoCheckin,
  getDemoCheckins,
  resetDemoCheckins,
} from '../services/demoCheckinStore.js'

test('Supabase 연결 정보가 없으면 데모 모드로 동작한다', () => {
  assert.equal(isDemoMode({}), true)
})

test('Supabase 연결 정보가 모두 있으면 실제 저장소 모드로 동작한다', () => {
  assert.equal(
    isDemoMode({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'example-key',
    }),
    false,
  )
})

test('DEMO_MODE=true이면 연결 정보가 있어도 데모 모드로 동작한다', () => {
  assert.equal(
    isDemoMode({
      DEMO_MODE: 'true',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'example-key',
    }),
    true,
  )
})

test('데모 기록은 생성, 조회, 삭제할 수 있다', async () => {
  resetDemoCheckins([])

  const created = await createDemoCheckin({
    rawText: '테스트 기록',
    emotion: '안도감',
    cause: '테스트를 통과했다.',
    action: '다음 테스트를 작성한다.',
    mood: '🙂',
  })

  const afterCreate = await getDemoCheckins()
  assert.equal(afterCreate.length, 1)
  assert.equal(afterCreate[0].id, created.id)
  assert.equal(afterCreate[0].rawText, '테스트 기록')

  await deleteDemoCheckin(created.id)
  assert.deepEqual(await getDemoCheckins(), [])

  resetDemoCheckins()
})

test('없는 데모 기록을 삭제하면 404 오류가 발생한다', async () => {
  resetDemoCheckins([])

  await assert.rejects(
    () => deleteDemoCheckin('missing-id'),
    (error) => {
      assert.equal(error.status, 404)
      return true
    },
  )

  resetDemoCheckins()
})
