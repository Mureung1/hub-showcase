import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConfidenceBadge from './ConfidenceBadge.jsx'

describe('ConfidenceBadge', () => {
  it.each([
    ['high', '정확도 높음'],
    ['medium', '정확도 보통'],
    ['low', '정확도 낮음 · 확인해보세요'],
  ])('confidence=%s는 "%s"를 보여준다', (confidence, expected) => {
    render(<ConfidenceBadge confidence={confidence} />)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('confidence가 없거나 모르는 값이면 아무 것도 그리지 않는다', () => {
    const { container: empty } = render(<ConfidenceBadge />)
    expect(empty).toBeEmptyDOMElement()

    const { container: unknown } = render(<ConfidenceBadge confidence="unknown" />)
    expect(unknown).toBeEmptyDOMElement()
  })
})
