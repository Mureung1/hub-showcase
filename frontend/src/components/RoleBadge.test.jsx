import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import RoleBadge from './RoleBadge'

describe('RoleBadge', () => {
  it('renders 파티장 label and owner class for role="owner"', () => {
    render(<RoleBadge role="owner" />)
    const badge = screen.getByText('파티장')
    expect(badge).toHaveClass('role-badge', 'role-badge-owner')
  })

  it('renders 파티원 label and member class for role="member"', () => {
    render(<RoleBadge role="member" />)
    const badge = screen.getByText('파티원')
    expect(badge).toHaveClass('role-badge', 'role-badge-member')
  })

  it('renders empty label but keeps class for unknown role', () => {
    const { container } = render(<RoleBadge role="guest" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('role-badge', 'role-badge-guest')
    expect(badge).toBeEmptyDOMElement()
  })
})
