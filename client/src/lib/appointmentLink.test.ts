import { describe, it, expect } from 'vitest'
import { buildAppointmentLink, parseAppointmentId } from './appointmentLink.ts'

describe('buildAppointmentLink', () => {
  it('현재 origin과 약속 id로 참여 링크를 만든다', () => {
    expect(buildAppointmentLink('abc-123')).toBe(`${window.location.origin}/a/abc-123`)
  })
})

describe('parseAppointmentId', () => {
  it('전체 URL에서 약속 id를 추출한다', () => {
    expect(parseAppointmentId('http://localhost:5173/a/abc-123')).toBe('abc-123')
  })

  it('뒤에 하위 경로가 붙어도 id만 추출한다', () => {
    expect(parseAppointmentId('https://hub.app/a/abc-123/schedule')).toBe('abc-123')
  })

  it('쿼리스트링이 붙어도 id만 추출한다', () => {
    expect(parseAppointmentId('https://hub.app/a/abc-123?ref=1')).toBe('abc-123')
  })

  it('앞뒤 공백은 무시한다', () => {
    expect(parseAppointmentId('  http://localhost:5173/a/abc-123  ')).toBe('abc-123')
  })

  it('/a/ 패턴이 없으면 null을 반환한다', () => {
    expect(parseAppointmentId('그냥 아무 텍스트')).toBeNull()
  })

  it('빈 문자열이면 null을 반환한다', () => {
    expect(parseAppointmentId('')).toBeNull()
    expect(parseAppointmentId('   ')).toBeNull()
  })
})
