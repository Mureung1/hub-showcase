import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Card from './Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>hello card</Card>)
    expect(screen.getByText('hello card')).toBeInTheDocument()
  })

  it('applies custom className alongside default styles', () => {
    render(<Card className="custom-class">content</Card>)
    expect(screen.getByText('content')).toHaveClass('custom-class')
    expect(screen.getByText('content')).toHaveClass('rounded-[16px]')
  })
})
