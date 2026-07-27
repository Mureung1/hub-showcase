import { describe, expect, it, vi } from 'vitest'
import { askTutor } from './tutorClient'

describe('tutorClient', () => {
  it('sends the question, code, mission context, and history', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ answer: 'useState는 상태 훅입니다.' }),
    })) as unknown as typeof fetch

    const result = await askTutor(
      {
        question: 'useState가 뭐야?',
        code: 'const [count, setCount] = useState(0)',
        fileName: 'Counter.jsx',
        missionTitle: '상태 관리',
        missionDetail: 'useState로 카운터 만들기',
        history: [{ role: 'user', text: '이전 질문' }],
      },
      fetchImpl,
    )

    expect(result).toEqual({ answer: 'useState는 상태 훅입니다.' })
    expect(fetchImpl).toHaveBeenCalledWith('/api/tutor/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'useState가 뭐야?',
        code: 'const [count, setCount] = useState(0)',
        fileName: 'Counter.jsx',
        missionTitle: '상태 관리',
        missionDetail: 'useState로 카운터 만들기',
        history: [{ role: 'user', text: '이전 질문' }],
      }),
    })
  })

  it('sends an abort signal when provided', async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ answer: 'useState는 상태 훅입니다.' }),
    })) as unknown as typeof fetch

    await askTutor(
      {
        question: 'useState가 뭐야?',
        code: '',
        fileName: 'Counter.jsx',
        missionTitle: '상태 관리',
        missionDetail: 'useState로 카운터 만들기',
        history: [],
      },
      fetchImpl,
      { signal: controller.signal },
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/tutor/ask',
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it('uses a readable Korean message for HTTP failures', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 502 })) as unknown as typeof fetch

    await expect(
      askTutor(
        { question: 'x', code: '', fileName: '', missionTitle: '', missionDetail: '', history: [] },
        fetchImpl,
      ),
    ).rejects.toThrow('튜터 질문 요청에 실패했습니다. (502)')
  })
})
