import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import InterestSelect from './InterestSelect'

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
})
