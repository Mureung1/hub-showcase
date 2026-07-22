import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(global.fetch).mockImplementation((url) => {
    if (String(url).includes('/api/profile')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(null) } as Response)
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
  })
  localStorage.clear()
})

test('온보딩 제출 시 POST /api/profile이 호출된다', async () => {
  const { container } = render(<App />)

  // Landing → OnboardingForm
  fireEvent.click(screen.getAllByRole('button', { name: '무료로 시작하기' })[0])

  // step 0→3: "다음" 4번 클릭
  for (let i = 0; i < 4; i++) {
    fireEvent.click(await screen.findByRole('button', { name: '다음' }))
  }

  // step 4: 폐업 예정일 입력 (submit 버튼 활성화 조건)
  const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement
  fireEvent.change(dateInput, { target: { value: '2026-09-30' } })

  fireEvent.click(screen.getByRole('button', { name: '맞춤 체크리스트 보기' }))

  await waitFor(() => {
    const calls = vi.mocked(global.fetch).mock.calls
    const profilePost = calls.find(
      ([url, opts]) =>
        String(url).includes('/api/profile') && (opts as RequestInit)?.method === 'POST'
    )
    expect(profilePost).toBeTruthy()
  })
})
