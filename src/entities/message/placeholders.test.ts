import { describe, expect, it } from 'vitest'
import { hasPlaceholder, isPlaceholder, splitPlaceholderText } from './placeholders'

describe('자리 표시자 감지', () => {
  it.each(['[과목명]', 'OO'])('%s 형식을 자리 표시자로 감지한다', (placeholder) => {
    expect(isPlaceholder(placeholder)).toBe(true)
    expect(hasPlaceholder(`안녕하세요 ${placeholder}`)).toBe(true)
  })

  it('문장 안의 자리 표시자를 강조 가능한 조각으로 분리한다', () => {
    expect(splitPlaceholderText('[과목명] 수업은 OO일입니다.')).toEqual(['', '[과목명]', ' 수업은 ', 'OO', '일입니다.'])
  })
})
