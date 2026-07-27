import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeCode } from './codeRunnerClient'

describe('codeRunnerClient', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('sends TSX, CSS, and an abort signal to the code runner', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8787')
    const controller = new AbortController()
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, logs: [], result: null }),
    })) as unknown as typeof fetch

    await executeCode('export default function App() { return <main /> }', 'tsx', {
      css: 'main { display: grid; }',
      fetchImpl,
      signal: controller.signal,
    })

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:8787/api/code/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'export default function App() { return <main /> }',
        language: 'tsx',
        css: 'main { display: grid; }',
      }),
      signal: controller.signal,
    })
  })

  it('uses a readable Korean message for HTTP failures', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503 })) as unknown as typeof fetch

    await expect(executeCode('console.log(1)', 'javascript', { fetchImpl })).rejects.toThrow(
      '코드 실행 요청에 실패했습니다. (503)',
    )
  })
})
