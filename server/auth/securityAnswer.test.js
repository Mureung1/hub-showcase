import { describe, it, expect } from 'vitest'
import { hashSecurityAnswer, verifySecurityAnswer } from './securityAnswer.js'

describe('hashSecurityAnswer / verifySecurityAnswer', () => {
  it('올바른 답변은 검증을 통과한다', async () => {
    const { hash, salt } = await hashSecurityAnswer('부산')
    expect(await verifySecurityAnswer('부산', salt, hash)).toBe(true)
  })

  it('틀린 답변은 검증에 실패한다', async () => {
    const { hash, salt } = await hashSecurityAnswer('부산')
    expect(await verifySecurityAnswer('서울', salt, hash)).toBe(false)
  })

  it('같은 답변도 매번 다른 salt/hash를 생성한다', async () => {
    const a = await hashSecurityAnswer('부산')
    const b = await hashSecurityAnswer('부산')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
  })

  it('해시/솔트는 hex 문자열이다', async () => {
    const { hash, salt } = await hashSecurityAnswer('부산')
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true)
    expect(/^[0-9a-f]+$/.test(salt)).toBe(true)
  })
})
