// 예시: React 컴포넌트 렌더링 테스트 (@testing-library/react)
// 기존 앱 컴포넌트가 아니라, 테스트 안에서 정의한 최소 컴포넌트를 쓴다.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

function Greeting({ name }) {
  return <h1>안녕하세요, {name}님</h1>
}

describe('예시: 컴포넌트 테스트', () => {
  it('전달한 이름이 화면에 보인다', () => {
    render(<Greeting name="철수" />)
    expect(screen.getByRole('heading')).toHaveTextContent('안녕하세요, 철수님')
  })
})
