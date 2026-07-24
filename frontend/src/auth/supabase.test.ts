import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthError, Session } from '@supabase/supabase-js'

const getSession = vi.fn()
const signInAnonymously = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession,
      signInAnonymously,
    },
  })),
}))

function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'user-1',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-07-22T00:00:00Z',
    },
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function loadSupabaseModule() {
  return import('./supabase')
}

beforeEach(() => {
  vi.resetModules()
  getSession.mockReset()
  signInAnonymously.mockReset()
})

describe('ensureAnonymousSession 동시 호출', () => {
  it('세션이 없을 때 동시에 여러 번 호출해도 signInAnonymously는 한 번만 실행되고, 모든 호출자가 같은 세션을 받는다', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    const session = buildSession()
    const signIn = deferred<{ data: { session: Session }; error: null }>()
    signInAnonymously.mockReturnValue(signIn.promise)

    const { ensureAnonymousSession } = await loadSupabaseModule()

    const call1 = ensureAnonymousSession()
    const call2 = ensureAnonymousSession()
    const call3 = ensureAnonymousSession()

    signIn.resolve({ data: { session }, error: null })

    const [result1, result2, result3] = await Promise.all([call1, call2, call3])

    expect(signInAnonymously).toHaveBeenCalledTimes(1)
    expect(result1).toEqual(session)
    expect(result2).toEqual(session)
    expect(result3).toEqual(session)
  })

  it('ensureAnonymousSession과 getAccessToken이 동시에 호출돼도 로그인은 한 번만 실행된다', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    const session = buildSession({ access_token: 'shared-access-token' })
    const signIn = deferred<{ data: { session: Session }; error: null }>()
    signInAnonymously.mockReturnValue(signIn.promise)

    const { ensureAnonymousSession, getAccessToken } = await loadSupabaseModule()

    const ensureCall = ensureAnonymousSession()
    const tokenCall = getAccessToken()

    signIn.resolve({ data: { session }, error: null })

    const [ensureResult, tokenResult] = await Promise.all([ensureCall, tokenCall])

    expect(signInAnonymously).toHaveBeenCalledTimes(1)
    expect(ensureResult).toEqual(session)
    expect(tokenResult).toBe('shared-access-token')
  })

  it('기존 세션이 있으면 signInAnonymously를 호출하지 않고 기존 세션을 그대로 반환한다', async () => {
    const existingSession = buildSession({ access_token: 'existing-token' })
    getSession.mockResolvedValue({ data: { session: existingSession }, error: null })

    const { ensureAnonymousSession } = await loadSupabaseModule()

    const result = await ensureAnonymousSession()

    expect(signInAnonymously).not.toHaveBeenCalled()
    expect(result).toEqual(existingSession)
  })

  it('로그인 실패는 동시에 기다리던 모든 호출자에게 전달되고, 다음 호출은 새로 로그인을 시도한다', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    const authError = { message: '로그인 실패', name: 'AuthApiError' } as AuthError
    const firstSignIn = deferred<{ data: { session: null }; error: AuthError }>()
    signInAnonymously.mockReturnValueOnce(firstSignIn.promise)

    const { ensureAnonymousSession } = await loadSupabaseModule()

    const call1 = ensureAnonymousSession()
    const call2 = ensureAnonymousSession()

    firstSignIn.resolve({ data: { session: null }, error: authError })

    await expect(call1).rejects.toBe(authError)
    await expect(call2).rejects.toBe(authError)
    expect(signInAnonymously).toHaveBeenCalledTimes(1)

    const secondSession = buildSession({ access_token: 'retry-token' })
    signInAnonymously.mockResolvedValueOnce({ data: { session: secondSession }, error: null })

    const retryResult = await ensureAnonymousSession()

    expect(signInAnonymously).toHaveBeenCalledTimes(2)
    expect(retryResult).toEqual(secondSession)
  })

  it('첫 로그인 성공 후에도 세션을 캐시하지 않고, 다음 호출은 getSession()을 다시 확인해 최신 세션을 반환한다', async () => {
    const firstSession = buildSession({ access_token: 'first-token' })
    getSession.mockResolvedValueOnce({ data: { session: null }, error: null })
    signInAnonymously.mockResolvedValueOnce({ data: { session: firstSession }, error: null })

    const { ensureAnonymousSession } = await loadSupabaseModule()

    const firstResult = await ensureAnonymousSession()
    expect(firstResult).toEqual(firstSession)
    expect(getSession).toHaveBeenCalledTimes(1)

    const refreshedSession = buildSession({ access_token: 'refreshed-token' })
    getSession.mockResolvedValueOnce({ data: { session: refreshedSession }, error: null })

    const secondResult = await ensureAnonymousSession()

    expect(getSession).toHaveBeenCalledTimes(2)
    expect(signInAnonymously).toHaveBeenCalledTimes(1)
    expect(secondResult).toEqual(refreshedSession)
  })
})
