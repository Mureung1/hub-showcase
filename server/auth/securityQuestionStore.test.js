import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseAdmin } from '../supabaseAdmin.js'
import { hashSecurityAnswer, verifySecurityAnswer } from './securityAnswer.js'
import { getSecurityQuestionByLoginId, registerSecurityQuestion, verifyAndResetPassword } from './securityQuestionStore.js'

vi.mock('../supabaseAdmin.js', () => ({ getSupabaseAdmin: vi.fn() }))
vi.mock('./securityAnswer.js', () => ({ hashSecurityAnswer: vi.fn(), verifySecurityAnswer: vi.fn() }))

function makeAdmin({ selectResult = { data: null, error: null }, updateResult = { error: null }, upsertResult = { error: null } } = {}) {
  const eqForSelect = vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue(selectResult) }))
  const eqForUpdate = vi.fn().mockResolvedValue(updateResult)
  const table = {
    upsert: vi.fn().mockResolvedValue(upsertResult),
    select: vi.fn(() => ({ eq: eqForSelect })),
    update: vi.fn(() => ({ eq: eqForUpdate })),
  }
  const updateUserById = vi.fn().mockResolvedValue({ error: null })
  return {
    from: vi.fn(() => table),
    auth: { admin: { updateUserById } },
    _table: table,
    _eqForSelect: eqForSelect,
    _eqForUpdate: eqForUpdate,
    _updateUserById: updateUserById,
  }
}

describe('registerSecurityQuestion', () => {
  beforeEach(() => vi.clearAllMocks())

  it('답을 해시하고 upsert로 저장한다', async () => {
    hashSecurityAnswer.mockResolvedValue({ hash: 'HASH', salt: 'SALT' })
    const admin = makeAdmin()
    getSupabaseAdmin.mockReturnValue(admin)

    await registerSecurityQuestion({ userId: 'u1', loginId: 'abc123', questionId: 'first-pet', answer: '부산' })

    expect(hashSecurityAnswer).toHaveBeenCalledWith('부산')
    expect(admin._table.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        login_id: 'abc123',
        question_id: 'first-pet',
        answer_hash: 'HASH',
        answer_salt: 'SALT',
        fail_count: 0,
        locked_until: null,
      }),
      { onConflict: 'user_id' },
    )
  })

  it('upsert가 에러를 반환하면 그대로 던진다', async () => {
    hashSecurityAnswer.mockResolvedValue({ hash: 'HASH', salt: 'SALT' })
    const admin = makeAdmin({ upsertResult: { error: new Error('boom') } })
    getSupabaseAdmin.mockReturnValue(admin)

    await expect(registerSecurityQuestion({ userId: 'u1', loginId: 'abc', questionId: 'first-pet', answer: 'x' })).rejects.toThrow('boom')
  })
})

describe('getSecurityQuestionByLoginId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('등록된 계정이면 questionId를 반환한다', async () => {
    const admin = makeAdmin({ selectResult: { data: { question_id: 'first-pet' }, error: null } })
    getSupabaseAdmin.mockReturnValue(admin)
    expect(await getSecurityQuestionByLoginId('abc123')).toEqual({ questionId: 'first-pet' })
  })

  it('등록된 계정이 없으면 null을 반환한다', async () => {
    const admin = makeAdmin({ selectResult: { data: null, error: null } })
    getSupabaseAdmin.mockReturnValue(admin)
    expect(await getSecurityQuestionByLoginId('abc123')).toBeNull()
  })
})

describe('verifyAndResetPassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('계정이 없으면 not_found를 반환한다', async () => {
    const admin = makeAdmin({ selectResult: { data: null, error: null } })
    getSupabaseAdmin.mockReturnValue(admin)
    expect(await verifyAndResetPassword({ loginId: 'abc', answer: 'x', newPassword: 'newpass1' })).toBe('not_found')
  })

  it('이미 잠긴 상태면 답을 검증하지 않고 locked를 반환한다', async () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    const admin = makeAdmin({ selectResult: { data: { user_id: 'u1', fail_count: 3, locked_until: future, answer_hash: 'h', answer_salt: 's' }, error: null } })
    getSupabaseAdmin.mockReturnValue(admin)

    expect(await verifyAndResetPassword({ loginId: 'abc', answer: 'x', newPassword: 'newpass1' })).toBe('locked')
    expect(verifySecurityAnswer).not.toHaveBeenCalled()
  })

  it('오답이고 아직 한도 미만이면 fail_count를 늘리고 wrong을 반환한다', async () => {
    verifySecurityAnswer.mockResolvedValue(false)
    const admin = makeAdmin({ selectResult: { data: { user_id: 'u1', fail_count: 1, locked_until: null, answer_hash: 'h', answer_salt: 's' }, error: null } })
    getSupabaseAdmin.mockReturnValue(admin)

    const result = await verifyAndResetPassword({ loginId: 'abc', answer: 'x', newPassword: 'newpass1' })
    expect(result).toBe('wrong')
    expect(admin._table.update).toHaveBeenCalledWith({ fail_count: 2, locked_until: null })
  })

  it('오답으로 한도(5회)에 도달하면 잠그고 locked를 반환한다', async () => {
    verifySecurityAnswer.mockResolvedValue(false)
    const admin = makeAdmin({ selectResult: { data: { user_id: 'u1', fail_count: 4, locked_until: null, answer_hash: 'h', answer_salt: 's' }, error: null } })
    getSupabaseAdmin.mockReturnValue(admin)

    const result = await verifyAndResetPassword({ loginId: 'abc', answer: 'x', newPassword: 'newpass1' })
    expect(result).toBe('locked')
    const call = admin._table.update.mock.calls[0][0]
    expect(call.fail_count).toBe(0)
    expect(call.locked_until).not.toBeNull()
  })

  it('정답이면 실패 카운트를 초기화하고 비밀번호를 변경한 뒤 ok를 반환한다', async () => {
    verifySecurityAnswer.mockResolvedValue(true)
    const admin = makeAdmin({ selectResult: { data: { user_id: 'u1', fail_count: 2, locked_until: null, answer_hash: 'h', answer_salt: 's' }, error: null } })
    getSupabaseAdmin.mockReturnValue(admin)

    const result = await verifyAndResetPassword({ loginId: 'abc', answer: 'x', newPassword: 'newpass1' })
    expect(result).toBe('ok')
    expect(admin._table.update).toHaveBeenCalledWith({ fail_count: 0, locked_until: null })
    expect(admin._updateUserById).toHaveBeenCalledWith('u1', { password: 'newpass1' })
  })
})
