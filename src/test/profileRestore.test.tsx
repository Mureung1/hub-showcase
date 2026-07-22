import { render, screen, waitFor } from '@testing-library/react'
import App from '../App'

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
})

test('재방문 시 GET /api/profile로 Dashboard가 복원된다', async () => {
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
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
  })

  render(<App />)

  // 서버 프로필이 복원되면 Dashboard의 "조건 다시 입력" 버튼이 보여야 함
  await waitFor(() => {
    expect(screen.getByRole('button', { name: '조건 다시 입력' })).toBeInTheDocument()
  })

  // GET /api/profile이 호출됐는지 확인
  const calls = vi.mocked(global.fetch).mock.calls
  expect(calls.some(([url]) => String(url).includes('/api/profile'))).toBe(true)
})
