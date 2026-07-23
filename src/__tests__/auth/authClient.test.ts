import { beforeEach, describe, expect, it, vi } from 'vitest'

function fakeResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

// accessToken은 모듈 안에 클로저로 갇혀있는 상태라, 테스트 간에 서로 영향을 안 주려면
// 매 테스트마다 모듈을 새로 리셋해서 깨끗한 상태로 가져와야 한다.
async function freshAuthClient() {
  vi.resetModules()
  return import('../../auth/authClient')
}

describe('authClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('login 성공 시 accessToken을 저장하고 유저 정보를 반환한다', async () => {
    const authClient = await freshAuthClient()
    vi.mocked(fetch).mockResolvedValue(fakeResponse(200, { accessToken: 'tok-1', user: { id: 'u1', email: 'a@b.com', name: 'A' } }))

    const user = await authClient.login('a@b.com', 'pw')

    expect(user).toEqual({ id: 'u1', email: 'a@b.com', name: 'A' })
    expect(authClient.getAccessToken()).toBe('tok-1')
  })

  it('login 실패 시 서버 error 메시지로 예외를 던지고 토큰을 저장하지 않는다', async () => {
    const authClient = await freshAuthClient()
    vi.mocked(fetch).mockResolvedValue(fakeResponse(401, { error: '비밀번호가 틀렸어요' }))

    await expect(authClient.login('a@b.com', 'wrong')).rejects.toThrow('비밀번호가 틀렸어요')
    expect(authClient.getAccessToken()).toBeNull()
  })

  it('signup 성공 시 accessToken을 저장한다', async () => {
    const authClient = await freshAuthClient()
    vi.mocked(fetch).mockResolvedValue(fakeResponse(200, { accessToken: 'tok-2', user: { id: 'u2', email: 'b@b.com', name: 'B' } }))

    await authClient.signup('b@b.com', 'pw12345', 'B')

    expect(authClient.getAccessToken()).toBe('tok-2')
  })

  it('refreshSession 실패 시 토큰을 비우고 null을 반환한다', async () => {
    const authClient = await freshAuthClient()
    vi.mocked(fetch).mockResolvedValue(fakeResponse(401, null))

    const user = await authClient.refreshSession()

    expect(user).toBeNull()
    expect(authClient.getAccessToken()).toBeNull()
  })

  it('refreshSession을 동시에 여러 번 호출해도 fetch는 한 번만 실행한다(진행 중인 요청 재사용)', async () => {
    const authClient = await freshAuthClient()
    let resolveFetch: (value: Response) => void = () => {}
    vi.mocked(fetch).mockReturnValue(new Promise((resolve) => { resolveFetch = resolve }))

    const first = authClient.refreshSession()
    const second = authClient.refreshSession()
    resolveFetch(fakeResponse(200, { accessToken: 'tok-3', user: { id: 'u3', email: 'c@b.com', name: 'C' } }))
    const [firstUser, secondUser] = await Promise.all([first, second])

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(firstUser).toEqual(secondUser)
  })

  it('logout 호출 시 토큰을 비운다', async () => {
    const authClient = await freshAuthClient()
    vi.mocked(fetch).mockResolvedValueOnce(fakeResponse(200, { accessToken: 'tok-4', user: { id: 'u4', email: 'd@b.com', name: 'D' } }))
    await authClient.login('d@b.com', 'pw')
    expect(authClient.getAccessToken()).toBe('tok-4')

    vi.mocked(fetch).mockResolvedValueOnce(fakeResponse(200, {}))
    await authClient.logout()

    expect(authClient.getAccessToken()).toBeNull()
  })
})
