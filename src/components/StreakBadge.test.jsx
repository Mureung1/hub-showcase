import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import StreakBadge from './StreakBadge.jsx'
import { toDateKey } from '../lib/records.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/dataStore.js', () => ({ getMealsByDateRange: vi.fn() }))

import { useUser } from '../context/UserContext.jsx'
import { getMealsByDateRange } from '../lib/dataStore.js'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDateKey(d)
}

describe('StreakBadge', () => {
  it('오늘·어제 기록이 있으면 "2일 연속 기록 중"이 보인다', async () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    getMealsByDateRange.mockResolvedValue({
      [daysAgo(0)]: [{ id: 'a' }],
      [daysAgo(1)]: [{ id: 'b' }],
    })

    render(<StreakBadge />)

    await waitFor(() => expect(screen.getByText('2일 연속 기록 중')).toBeInTheDocument())
  })

  it('연속 기록이 없으면(0일) 아무 것도 그리지 않는다', async () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    getMealsByDateRange.mockResolvedValue({})

    const { container } = render(<StreakBadge />)

    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('조회에 실패해도 조용히 아무 것도 그리지 않는다(장식용 배지라 에러 카드를 띄우지 않음)', async () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    getMealsByDateRange.mockRejectedValue(new Error('network'))

    const { container } = render(<StreakBadge />)

    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
