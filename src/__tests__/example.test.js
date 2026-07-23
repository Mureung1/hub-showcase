// 테스트 환경이 제대로 동작하는지 확인하는 예시 테스트.
// TDD 연습을 시작할 때 이 파일을 지우거나 참고용 템플릿으로 써도 된다.
import { describe, it, expect } from 'vitest'

// 실제 앱 코드는 건드리지 않고, 테스트 안에서만 쓰는 예시 함수
function add(a, b) {
  return a + b
}

describe('예시: 순수 함수 테스트', () => {
  it('두 수를 더한다', () => {
    expect(add(1, 2)).toBe(3)
  })

  it('음수도 처리한다', () => {
    expect(add(-5, 3)).toBe(-2)
  })
})

describe('예시: jsdom 환경 확인', () => {
  it('document를 사용할 수 있다', () => {
    const el = document.createElement('div')
    el.textContent = '안녕'
    document.body.appendChild(el)

    // @testing-library/jest-dom 매처가 등록돼 있어야 통과한다
    expect(el).toBeInTheDocument()
    expect(el).toHaveTextContent('안녕')
  })
})
