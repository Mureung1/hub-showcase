import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import EntryScreen from './EntryScreen'

function createSupabaseMock(overrides = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1', email: 'demo@example.com' } } },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      ...overrides,
    },
  }
}

test('게스트 시작을 선택할 수 있다', () => {
  const onStartGuest = vi.fn()
  render(<EntryScreen onStartGuest={onStartGuest} />)

  fireEvent.click(screen.getByRole('button', { name: /게스트로 시작/ }))

  expect(onStartGuest).toHaveBeenCalledOnce()
})

test('이메일과 비밀번호로 로그인하고 클라우드 모드에 진입한다', async () => {
  const supabaseClient = createSupabaseMock()
  const onAuthenticated = vi.fn()
  render(
    <EntryScreen
      onStartGuest={() => {}}
      onAuthenticated={onAuthenticated}
      supabaseClient={supabaseClient}
      isSupabaseConfigured
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: /로그인해서 동기화/ }))
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'demo@example.com' } })
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password' } })
  fireEvent.click(screen.getAllByRole('button', { name: '로그인' }).at(-1))

  await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce())
  expect(supabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
    email: 'demo@example.com',
    password: 'password',
  })
})

test('회원가입 후 이메일 확인 안내를 보여준다', async () => {
  const supabaseClient = createSupabaseMock()
  render(
    <EntryScreen
      onStartGuest={() => {}}
      onAuthenticated={() => {}}
      supabaseClient={supabaseClient}
      isSupabaseConfigured
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: /로그인해서 동기화/ }))
  fireEvent.click(screen.getAllByRole('button', { name: '회원가입' }).at(-1))
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'new@example.com' } })
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password' } })
  fireEvent.click(screen.getAllByRole('button', { name: '회원가입' }).at(-1))

  expect(await screen.findByRole('status')).toHaveTextContent('가입 확인 메일')
  expect(supabaseClient.auth.signUp).toHaveBeenCalledWith({
    email: 'new@example.com',
    password: 'password',
  })
})
