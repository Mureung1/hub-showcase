import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createCheckin, getCheckins, deleteCheckin } from '../services/checkinService.js'

test('deleteCheckin removes the row so it no longer appears in getCheckins', async () => {
  const created = await createCheckin({
    rawText: '[테스트] deleteCheckin 임시 기록',
    emotion: 'test-emotion',
    cause: 'test-cause',
    action: 'test-action',
  })

  await deleteCheckin(created.id)

  const remaining = await getCheckins()
  assert.ok(!remaining.some((c) => c.id === created.id))
})

test('deleteCheckin on a missing id throws a 404 error', async () => {
  await assert.rejects(
    () => deleteCheckin('00000000-0000-0000-0000-000000000000'),
    (err) => {
      assert.equal(err.status, 404)
      return true
    },
  )
})
