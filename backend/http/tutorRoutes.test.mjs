import { describe, expect, it, vi } from 'vitest'
import { handleTutorApiRequest, tutorAskPath } from './tutorRoutes.mjs'

describe('tutor routes', () => {
  it('surfaces a provider failure as a 502', async () => {
    // Injects a fake failing provider instead of relying on a real network
    // call to Gemini with a fabricated API key — deterministic and fast,
    // and exercises routing + body parsing all the way through to askTutor
    // and back to the error-mapping branch.
    const provider = vi.fn(async () => {
      throw new Error('simulated Gemini failure')
    })

    const result = await handleTutorApiRequest({
      method: 'POST',
      url: tutorAskPath,
      bodyText: JSON.stringify({
        question: 'useState가 뭐야?',
        code: 'const [count, setCount] = useState(0)',
        fileName: 'Counter.jsx',
        missionTitle: '상태 관리',
        missionDetail: 'useState로 카운터 만들기',
        history: [],
      }),
      config: { provider: 'developer', model: 'gemini-flash-latest', apiKey: 'test-key' },
      knowledgeChunks: [],
      provider,
      logger: { error: vi.fn() },
    })

    expect(result).toMatchObject({ status: 502, body: { error: 'tutor_agent_failed' } })
    expect(provider).toHaveBeenCalled()
  })

  it('returns the tutor answer for a valid question using an injected provider', async () => {
    const provider = vi.fn(async () => 'useState는 함수형 컴포넌트에서 상태를 다루는 React 훅입니다.')

    const result = await handleTutorApiRequest({
      method: 'POST',
      url: tutorAskPath,
      bodyText: JSON.stringify({
        question: 'useState가 뭐야?',
        code: 'const [count, setCount] = useState(0)',
        fileName: 'Counter.jsx',
        missionTitle: '상태 관리',
        missionDetail: 'useState로 카운터 만들기',
        history: [],
      }),
      config: { provider: 'developer', model: 'gemini-flash-latest', apiKey: 'test-key' },
      knowledgeChunks: [],
      provider,
      logger: { error: vi.fn() },
    })

    expect(result).toMatchObject({
      status: 200,
      body: { answer: 'useState는 함수형 컴포넌트에서 상태를 다루는 React 훅입니다.' },
    })
    expect(provider).toHaveBeenCalled()
  })

  it('ignores unrelated paths', async () => {
    const result = await handleTutorApiRequest({ method: 'GET', url: '/api/unrelated' })
    expect(result).toBeNull()
  })

  it('handles CORS preflight', async () => {
    const result = await handleTutorApiRequest({ method: 'OPTIONS', url: tutorAskPath })
    expect(result).toMatchObject({ status: 204 })
  })

  it('rejects invalid JSON bodies', async () => {
    const result = await handleTutorApiRequest({ method: 'POST', url: tutorAskPath, bodyText: '{not json' })
    expect(result).toMatchObject({ status: 400, body: { error: 'invalid_json' } })
  })

  it('rejects an empty question', async () => {
    const result = await handleTutorApiRequest({
      method: 'POST',
      url: tutorAskPath,
      bodyText: JSON.stringify({ question: '   ' }),
      config: { provider: 'developer', model: 'x', apiKey: 'k' },
      logger: { error: vi.fn() },
    })

    expect(result).toMatchObject({ status: 400, body: { error: 'invalid_question' } })
  })

  it('returns a configuration error when the API key is missing', async () => {
    const result = await handleTutorApiRequest({
      method: 'POST',
      url: tutorAskPath,
      bodyText: JSON.stringify({ question: 'props가 뭐야?' }),
      config: { provider: 'developer', model: 'gemini-flash-latest' },
      logger: { error: vi.fn() },
    })

    expect(result).toMatchObject({ status: 500, body: { error: 'agent_configuration_error' } })
  })
})
