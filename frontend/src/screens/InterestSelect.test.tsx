import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import InterestSelect from './InterestSelect'
import type { Interest } from '../api/types'

function makeInterests(count: number): Interest[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `interest-${i + 1}`,
    name: `관심사${i + 1}`,
    displayOrder: i + 1,
    launchStatus: 'active' as const,
    riskLevel: 'low' as const,
    emptyStateMessage: null,
  }))
}

describe('InterestSelect', () => {
  it('loads interests and saves selected ids before completing', async () => {
    const onComplete = vi.fn()
    const replace = vi.fn().mockResolvedValue({ interestIds: ['interest-1'] })
    render(
      <InterestSelect
        interests={[
          {
            id: 'interest-1',
            name: 'IT·개발',
            displayOrder: 1,
            launchStatus: 'active',
            riskLevel: 'low',
            emptyStateMessage: null,
          },
        ]}
        initialSelectedIds={[]}
        onSave={replace}
        onComplete={onComplete}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'IT·개발' }))
    await userEvent.click(screen.getByRole('button', { name: /깸 시작하기/ }))
    expect(replace).toHaveBeenCalledWith(['interest-1'])
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(replace.mock.invocationCallOrder[0]).toBeLessThan(
      onComplete.mock.invocationCallOrder[0],
    )
  })

  it('keeps the screen open and shows an error when save fails', async () => {
    const onComplete = vi.fn()
    const replace = vi.fn().mockRejectedValue(new Error('network'))
    render(
      <InterestSelect
        interests={[
          {
            id: 'interest-1',
            name: 'IT·개발',
            displayOrder: 1,
            launchStatus: 'active',
            riskLevel: 'low',
            emptyStateMessage: null,
          },
        ]}
        initialSelectedIds={['interest-1']}
        onSave={replace}
        onComplete={onComplete}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /깸 시작하기/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/다시 시도/)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('shows the content loading screen immediately after clicking the CTA, before save resolves', async () => {
    let resolveSave: ((value: { interestIds: string[] }) => void) | undefined
    const replace = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve
        }),
    )
    render(
      <InterestSelect
        interests={makeInterests(1)}
        initialSelectedIds={['interest-1']}
        onSave={replace}
        onComplete={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /깸 시작하기/ }))

    expect(await screen.findByRole('status')).toHaveTextContent('관심사에 맞는 오늘의 글을 고르고 있어요')

    resolveSave?.({ interestIds: ['interest-1'] })
  })

  it('does not show the more button when there are 11 or fewer interests', () => {
    render(
      <InterestSelect
        interests={makeInterests(11)}
        initialSelectedIds={[]}
        onSave={vi.fn()}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /더보기/ })).not.toBeInTheDocument()
  })

  it('shows the exact remaining count on the more button when there are 12 or more interests', () => {
    render(
      <InterestSelect
        interests={makeInterests(12)}
        initialSelectedIds={[]}
        onSave={vi.fn()}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '더보기 (1개)' })).toBeInTheDocument()
  })
})
