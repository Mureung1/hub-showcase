import { describe, it, expect, vi, afterEach } from 'vitest'

process.env.ANTHROPIC_API_KEY ??= 'test-key'

const { callClaudeTool } = await import('../src/services/claude.client.js')

const TOOL = { name: 'test_tool' }

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('callClaudeTool', () => {
  it('API 키가 없으면 에러를 던진다', async () => {
    const original = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    await expect(callClaudeTool({ tool: TOOL, userMessage: 'hi' })).rejects.toThrow('ANTHROPIC_API_KEY')
    process.env.ANTHROPIC_API_KEY = original
  })

  it('정상 응답이면 tool_use 블록의 input을 반환한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'tool_use', input: { foo: 'bar' } }] }),
    })
    const result = await callClaudeTool({ tool: TOOL, userMessage: 'hi' })
    expect(result).toEqual({ foo: 'bar' })
  })

  it('응답 status가 실패(ok:false)면 에러를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 })
    await expect(callClaudeTool({ tool: TOOL, userMessage: 'hi' })).rejects.toThrow('status 500')
  })

  it('응답이 유효한 JSON이 아니면 에러를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('invalid json')
      },
    })
    await expect(callClaudeTool({ tool: TOOL, userMessage: 'hi' })).rejects.toThrow('유효한 JSON')
  })

  it('응답에 tool_use 블록이 없으면 에러를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '분석 결과 없음' }] }),
    })
    await expect(callClaudeTool({ tool: TOOL, userMessage: 'hi' })).rejects.toThrow('찾을 수 없습니다')
  })

  it('네트워크 오류가 나면 에러를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNRESET'))
    await expect(callClaudeTool({ tool: TOOL, userMessage: 'hi' })).rejects.toThrow('네트워크 오류')
  })

  it('응답이 타임아웃 시간 안에 오지 않으면 타임아웃 에러를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const err = new Error('aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
    })

    vi.useFakeTimers()
    const promise = callClaudeTool({ tool: TOOL, userMessage: 'hi' })
    const assertion = expect(promise).rejects.toThrow('타임아웃')
    await vi.advanceTimersByTimeAsync(15000)
    await assertion
  })
})
