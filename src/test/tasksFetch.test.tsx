import { render, screen, waitFor } from '@testing-library/react'
import App from '../App'

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
})

test('마운트 시 GET /api/tasks가 호출된다', async () => {
  vi.mocked(global.fetch).mockImplementation((url) => {
    if (String(url).includes('/api/profile')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            industry: '요식업',
            isCorporation: false,
            hasEmployee: false,
            isRented: false,
            closureDate: '2026-09-30',
          }),
      } as Response)
    }
    if (String(url).includes('/api/tasks')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ taskIds: ['business-closure-report', 'vat-final-return', 'income-tax-return', 'reemployment-program', 'food-service-business-report-closure'] }),
      } as Response)
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
  })

  render(<App />)

  await waitFor(() => {
    const calls = vi.mocked(global.fetch).mock.calls
    expect(calls.some(([url]) => String(url).includes('/api/tasks'))).toBe(true)
  })
})
