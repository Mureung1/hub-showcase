import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { zodIssuesToFields } from './zodFields.js'

describe('zodIssuesToFields', () => {
  it('issue의 path를 key로, message를 value로 하는 객체를 만든다', () => {
    const schema = z.object({
      name: z.string().min(1, '이름을 입력해주세요'),
      password: z.string().regex(/^\d{4}$/, '숫자 4자리를 입력해주세요'),
    })
    const result = schema.safeParse({ name: '', password: 'abcd' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(zodIssuesToFields(result.error.issues)).toEqual({
      name: '이름을 입력해주세요',
      password: '숫자 4자리를 입력해주세요',
    })
  })

  it('같은 필드에 issue가 여러 개면 첫 번째 메시지만 남긴다', () => {
    const schema = z.object({
      password: z.string().min(4, '4자 이상이어야 해요').regex(/^\d+$/, '숫자만 입력해주세요'),
    })
    const result = schema.safeParse({ password: 'ab' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(zodIssuesToFields(result.error.issues)).toEqual({ password: '4자 이상이어야 해요' })
  })
})
