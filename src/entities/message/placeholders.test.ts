import { describe, expect, it } from 'vitest'
import {
  findFirstPlaceholderRange,
  hasPlaceholder,
  isPlaceholder,
  splitPlaceholderText,
} from './placeholders'

describe('자리 표시자 감지', () => {
  it.each(['[과목명]', 'OO'])('%s 형식을 자리 표시자로 감지한다', (placeholder) => {
    expect(isPlaceholder(placeholder)).toBe(true)
    expect(hasPlaceholder(`안녕하세요 ${placeholder}`)).toBe(true)
  })

  it('문장 안의 자리 표시자를 강조 가능한 조각으로 분리한다', () => {
    expect(splitPlaceholderText('[과목명] 수업은 OO일입니다.')).toEqual(['', '[과목명]', ' 수업은 ', 'OO', '일입니다.'])
  })

  it('편집을 시작할 때 첫 자리 표시자를 바로 바꿀 수 있도록 범위를 찾는다', () => {
    expect(findFirstPlaceholderRange('혹시 [부탁할 내용] 가능할까요? OO까지 알려주세요.')).toEqual({
      start: 3,
      end: 11,
    })
    expect(findFirstPlaceholderRange('채울 내용이 없는 문장')).toBeNull()
  })
})
