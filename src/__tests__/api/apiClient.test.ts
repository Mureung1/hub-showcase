import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../auth/authClient', () => ({
  getAccessToken: vi.fn(),
  refreshSession: vi.fn(),
}))

const { getAccessToken, refreshSession } = await import('../../auth/authClient')
const { request } = await import('../../components/scheduler/apiClient')

function fakeResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('request', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('토큰이 있으면 Authorization 헤더를 붙이고, 성공하면 JSON을 그대로 반환한다', async () => {
    vi.mocked(getAccessToken).mockReturnValue('token-123')
    vi.mocked(fetch).mockResolvedValue(fakeResponse(200, { hello: 'world' }))

    const result = await request<{ hello: string }>('/api/things')

    expect(result).toEqual({ hello: 'world' })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token-123')
  })

  it('토큰이 없으면 Authorization 헤더를 붙이지 않는다', async () => {
    vi.mocked(getAccessToken).mockReturnValue(null)
    vi.mocked(fetch).mockResolvedValue(fakeResponse(200, {}))

    await request('/api/things')

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('204면 응답 본문을 파싱하지 않고 undefined를 반환한다', async () => {
    vi.mocked(getAccessToken).mockReturnValue(null)
    const response = fakeResponse(204, null)
    vi.mocked(fetch).mockResolvedValue(response)

    const result = await request('/api/things', { method: 'DELETE' })

    expect(result).toBeUndefined()
    expect(response.json).not.toHaveBeenCalled()
  })

  it('401을 받으면 refreshSession을 호출하고, 성공하면 한 번만 재시도한다', async () => {
    vi.mocked(getAccessToken).mockReturnValue('expired-token')
    vi.mocked(refreshSession).mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'A' })
    vi.mocked(fetch)
      .mockResolvedValueOnce(fakeResponse(401, { error: '토큰 만료' }))
      .mockResolvedValueOnce(fakeResponse(200, { ok: true }))

    const result = await request('/api/things')

    expect(result).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('401을 받았는데 refreshSession도 실패하면 재시도하지 않고 에러를 던진다', async () => {
    vi.mocked(getAccessToken).mockReturnValue('expired-token')
    vi.mocked(refreshSession).mockResolvedValue(null)
    vi.mocked(fetch).mockResolvedValue(fakeResponse(401, { error: '로그인이 필요해요' }))

    await expect(request('/api/things')).rejects.toThrow('로그인이 필요해요')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('실패 응답의 error 필드를 메시지로 사용해 예외를 던진다', async () => {
    vi.mocked(getAccessToken).mockReturnValue(null)
    vi.mocked(fetch).mockResolvedValue(fakeResponse(400, { error: '잘못된 요청이에요' }))

    await expect(request('/api/things')).rejects.toThrow('잘못된 요청이에요')
  })

  it('실패 응답 본문이 JSON이 아니면 상태 코드를 포함한 기본 메시지를 던진다', async () => {
    vi.mocked(getAccessToken).mockReturnValue(null)
    const response = {
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('not json')),
    } as unknown as Response
    vi.mocked(fetch).mockResolvedValue(response)

    await expect(request('/api/things')).rejects.toThrow('API 요청 실패: 500')
  })
})
