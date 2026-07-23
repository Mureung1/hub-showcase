import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Badge from './Badge'

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>전공필수</Badge>)
    expect(screen.getByText('전공필수')).toBeInTheDocument()
  })

  it('applies the variant class', () => {
    render(<Badge variant="success">완료</Badge>)
    expect(screen.getByText('완료')).toHaveClass('badge--success')
  })

  it('defaults to the default variant', () => {
    render(<Badge>기본</Badge>)
    expect(screen.getByText('기본')).toHaveClass('badge--default')
  })
})
