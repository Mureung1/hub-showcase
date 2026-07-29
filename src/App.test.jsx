import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import App from './App'
import { supabase } from './lib/supabaseClient'

vi.mock('./lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

function mockAuthSubscription() {
  const unsubscribe = vi.fn()
  supabase.auth.onAuthStateChange.mockReturnValue({
    data: {
      subscription: { unsubscribe },
    },
  })
  return unsubscribe
}

async function startGuestPlanner(user) {
  await user.click(await screen.findByRole('button', { name: '학습 계획 시작하기' }))
}

async function createGuestToeicPlan(user) {
  await startGuestPlanner(user)
  await user.click(screen.getByRole('button', { name: /TOEIC 취업과 졸업 요건/ }))
  await user.click(screen.getByRole('button', { name: '정보 입력' }))
  await user.type(screen.getByLabelText('목표 점수'), '850')
  await user.type(screen.getByLabelText('시험일'), '2026-08-31')
  await user.type(screen.getByLabelText('하루 공부 시간(분)'), '120')
  await user.click(screen.getByRole('button', { name: '다음' }))
  await user.click(screen.getByRole('button', { name: /LC/ }))
  await user.click(screen.getByRole('button', { name: '학습 계획 생성하기' }))
}

describe('App authentication flow', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    mockAuthSubscription()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  test('shows the landing screen when there is no saved session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<App />)

    expect(await screen.findByRole('heading', { name: '나에게 맞는 오늘의 학습 계획' })).toBeInTheDocument()
    expect(screen.getByText('시험과 목표, 취약 영역을 바탕으로 매일 달라지는 학습 계획을 만들어 주는 서비스')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '회원가입' })).toBeInTheDocument()
  })

  test('opens the login form from the landing screen and returns to the landing screen', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '로그인' }))

    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '돌아가기' }))

    expect(screen.getByRole('heading', { name: '나에게 맞는 오늘의 학습 계획' })).toBeInTheDocument()
  })

  test('opens sign up from the landing header button', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '회원가입' }))

    expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument()
  })

  test('starts the planner from the landing page without requiring login', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<App />)

    await startGuestPlanner(user)

    expect(screen.getByText('비로그인 체험 중')).toBeInTheDocument()
    expect(screen.getByText('선택 시험: 선택 전')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '회원가입' })).toBeInTheDocument()
  })

  test('creates a guest study plan without sending the study plan POST request', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await createGuestToeicPlan(user)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(await screen.findByRole('heading', { name: '학습 계획' })).toBeInTheDocument()
    const dialog = screen.getByRole('dialog', { name: '로그인이 필요합니다' })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('학습 기록을 저장하고 다음 계획에 반영하려면 로그인해 주세요.')).toBeInTheDocument()
  })

  test('closes the guest save prompt when the later button is clicked', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<App />)

    await createGuestToeicPlan(user)
    await user.click(await screen.findByRole('button', { name: '나중에' }))

    expect(screen.queryByRole('dialog', { name: '로그인이 필요합니다' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '학습 계획' })).toBeInTheDocument()
  })

  test('restores a session and shows the planner with the nickname', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'learner@example.com', user_metadata: { nickname: '계획러' } } } },
      error: null,
    })

    render(<App />)

    expect(await screen.findByText('계획러님')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
    expect(screen.getByText('선택 시험: 선택 전')).toBeInTheDocument()
  })

  test('falls back to the email prefix when the user has no nickname', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'learner@example.com' } } },
      error: null,
    })

    render(<App />)

    expect(await screen.findByText('learner님')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
    expect(screen.getByText('선택 시험: 선택 전')).toBeInTheDocument()
  })

  test('calls Supabase sign in with email and password', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '로그인' }))
    await user.type(await screen.findByLabelText('이메일'), 'learner@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'learner@example.com',
      password: 'secret123',
    })
  })

  test('calls Supabase sign up with email, password, and nickname metadata', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    supabase.auth.signUp.mockResolvedValue({ error: null })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '회원가입' }))
    expect(screen.getByLabelText('닉네임')).toBeInTheDocument()
    await user.type(screen.getByLabelText('닉네임'), '  새친구  ')
    await user.type(await screen.findByLabelText('이메일'), 'new@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'secret123',
      options: {
        data: {
          nickname: '새친구',
        },
      },
    })
  })

  test('does not show nickname input in sign in mode', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '로그인' }))

    expect(screen.queryByLabelText('닉네임')).not.toBeInTheDocument()
  })

  test('does not call Supabase when auth fields are empty', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '회원가입' }))
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByText('이메일을 입력해 주세요.')).toBeInTheDocument()
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })

  test('does not call Supabase when the sign up nickname is blank', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '회원가입' }))
    await user.type(screen.getByLabelText('닉네임'), '   ')
    await user.type(screen.getByLabelText('이메일'), 'new@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByText('닉네임을 입력해 주세요.')).toBeInTheDocument()
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })

  test('toggles password visibility without changing the password value', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '로그인' }))
    const passwordInput = screen.getByLabelText('비밀번호')

    await user.type(passwordInput, 'secret123')

    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: '비밀번호 보기' }))

    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(passwordInput).toHaveValue('secret123')

    await user.click(screen.getByRole('button', { name: '비밀번호 숨기기' }))

    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(passwordInput).toHaveValue('secret123')
  })

  test('does not submit the form when the password visibility button is clicked', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '로그인' }))
    await user.type(screen.getByLabelText('이메일'), 'learner@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    await user.click(screen.getByRole('button', { name: '비밀번호 보기' }))

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  test('resets password visibility after switching between login and sign up screens', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '로그인' }))
    await user.click(screen.getByRole('button', { name: '비밀번호 보기' }))
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: '돌아가기' }))
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('type', 'password')
  })

  test('enters the planner when sign up returns a session', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    supabase.auth.signUp.mockResolvedValue({
      data: { session: { user: { id: 'user-2', email: 'new@example.com' } } },
      error: null,
    })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '회원가입' }))
    await user.type(screen.getByLabelText('닉네임'), '새친구')
    await user.type(screen.getByLabelText('이메일'), 'new@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByText('new님')).toBeInTheDocument()
    expect(screen.getByText('선택 시험: 선택 전')).toBeInTheDocument()
  })

  test('shows an email confirmation message when sign up succeeds without a session', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: { id: 'user-2', email: 'new@example.com' } },
      error: null,
    })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '회원가입' }))
    await user.type(screen.getByLabelText('닉네임'), '새친구')
    await user.type(screen.getByLabelText('이메일'), 'new@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByText('가입 확인 메일을 보냈습니다. 이메일의 확인 링크를 누른 뒤 로그인해 주세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인으로 이동' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '회원가입' })).toBeDisabled()
  })

  test('translates Supabase rate limit errors', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    supabase.auth.signUp.mockResolvedValue({
      error: { message: 'For security purposes, you can only request this after 42 seconds.' },
    })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '회원가입' }))
    await user.type(screen.getByLabelText('닉네임'), '새친구')
    await user.type(screen.getByLabelText('이메일'), 'new@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByText('회원가입 요청이 너무 빠르게 반복되었습니다. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
  })

  test('shows an auth error message when sign in fails', async () => {
    const user = userEvent.setup()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '로그인' }))
    await user.type(await screen.findByLabelText('이메일'), 'learner@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('이메일 또는 비밀번호가 올바르지 않습니다.')).toBeInTheDocument()
  })

  test('signs out and clears the saved study plan id', async () => {
    const user = userEvent.setup()
    localStorage.setItem('studyPlanId', '123e4567-e89b-12d3-a456-426614174000')
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'learner@example.com' } } },
      error: null,
    })
    supabase.auth.signOut.mockResolvedValue({ error: null })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: '로그아웃' }))

    await waitFor(() => {
    expect(localStorage.getItem('studyPlanId')).toBeNull()
    })
    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(screen.getByText('비로그인 체험 중')).toBeInTheDocument()
    expect(screen.getByText('선택 시험: 선택 전')).toBeInTheDocument()
  })
})
