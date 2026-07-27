import { describe, expect, it, vi } from 'vitest'
import { createKnowledgeContext, createPrompt, runTutorAgent } from './geminiTutorProvider.mjs'

const baseRequest = {
  question: 'useState가 뭐야?',
  code: 'const [count, setCount] = useState(0)',
  fileName: 'Counter.jsx',
  missionTitle: '상태 관리',
  missionDetail: 'useState로 카운터 만들기',
  history: [],
  knowledgeContext: [],
}

describe('gemini tutor provider', () => {
  it('creates a compact knowledge context capped at 3 chunks', () => {
    const longText = 'React '.repeat(120)

    expect(
      createKnowledgeContext([
        { topic: 'react', docTitle: 'React Docs', sectionHeading: 'State', url: 'https://ko.react.dev/', chunkText: longText },
        { topic: 'react', docTitle: 'A', sectionHeading: 'B', url: 'https://a', chunkText: 'a' },
        { topic: 'react', docTitle: 'C', sectionHeading: 'D', url: 'https://c', chunkText: 'c' },
        { topic: 'react', docTitle: 'E', sectionHeading: 'F', url: 'https://e', chunkText: 'e' },
      ]),
    ).toEqual([
      { topic: 'react', docTitle: 'React Docs', sectionHeading: 'State', url: 'https://ko.react.dev/', chunkText: longText.slice(0, 500) },
      { topic: 'react', docTitle: 'A', sectionHeading: 'B', url: 'https://a', chunkText: 'a' },
      { topic: 'react', docTitle: 'C', sectionHeading: 'D', url: 'https://c', chunkText: 'c' },
    ])
  })

  it('includes the current code, mission context, and history in the prompt', () => {
    const prompt = JSON.parse(
      createPrompt({
        ...baseRequest,
        history: [{ role: 'user', text: '이전 질문' }],
      }),
    )

    expect(prompt).toMatchObject({
      learnerQuestion: 'useState가 뭐야?',
      currentFile: { fileName: 'Counter.jsx', code: 'const [count, setCount] = useState(0)' },
      missionContext: { title: '상태 관리', detail: 'useState로 카운터 만들기' },
      conversationHistory: [{ role: 'user', text: '이전 질문' }],
      knowledgeContext: [],
    })
  })

  it('calls Gemini generateContent and returns the trimmed answer text', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      text: async () =>
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '  useState는 상태 훅입니다.  ' }] } }],
        }),
    }))

    const answer = await runTutorAgent({
      ...baseRequest,
      config: { provider: 'developer', model: 'gemini-flash-latest', apiKey: 'test-key' },
      fetchImpl,
    })

    expect(answer).toBe('useState는 상태 훅입니다.')
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('rejects when the API key is missing', async () => {
    await expect(
      runTutorAgent({ ...baseRequest, config: { provider: 'developer', model: 'gemini-flash-latest' } }),
    ).rejects.toThrow('GEMINI_API_KEY is missing')
  })

  it('rejects unsupported providers', async () => {
    await expect(
      runTutorAgent({ ...baseRequest, config: { provider: 'other', model: 'x', apiKey: 'k' } }),
    ).rejects.toThrow('Unsupported tutor agent provider')
  })
})
