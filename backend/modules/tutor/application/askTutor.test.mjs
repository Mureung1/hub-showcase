import { describe, expect, it, vi } from 'vitest'
import { askTutor } from './askTutor.mjs'

const reactChunk = {
  id: 'react-1',
  sourceType: 'official-doc',
  topic: 'react',
  docTitle: 'React Quick Start',
  sectionHeading: 'State',
  url: 'https://ko.react.dev/learn/state-a-components-memory',
  chunkText: 'useState 훅으로 컴포넌트가 값을 기억하게 만드는 방법을 배웁니다.',
}

const backendChunk = {
  id: 'backend-1',
  sourceType: 'official-doc',
  topic: 'backend',
  docTitle: 'FastAPI Path Parameters',
  sectionHeading: 'Path Parameters',
  url: 'https://fastapi.tiangolo.com/tutorial/path-params/',
  chunkText: 'FastAPI 경로 매개변수를 사용해 URL 경로에서 값을 추출하는 방법을 배웁니다.',
}

describe('askTutor use case', () => {
  it('normalizes the request and returns the provider answer', async () => {
    const provider = vi.fn(async () => '  useState는 상태 훅입니다.  ')

    await expect(
      askTutor({
        question: '  useState가 뭐야?  ',
        code: 'const [count, setCount] = useState(0)',
        fileName: 'Counter.jsx',
        missionTitle: '리액트 상태 관리',
        missionDetail: 'useState로 카운터 만들기',
        history: [],
        config: { provider: 'developer', model: 'gemini-flash-latest', apiKey: 'test-key' },
        knowledgeChunks: [],
        provider,
      }),
    ).resolves.toEqual({ answer: '  useState는 상태 훅입니다.  ' })

    expect(provider).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'useState가 뭐야?', knowledgeContext: [] }),
    )
  })

  it('boosts knowledge chunks whose topic matches the inferred track for the mission/question', async () => {
    const provider = vi.fn(async () => '설명')

    await askTutor({
      question: 'useState가 뭐야?',
      missionTitle: '리액트 상태 관리',
      config: { provider: 'developer', model: 'gemini-flash-latest', apiKey: 'test-key' },
      knowledgeChunks: [backendChunk, reactChunk],
      provider,
    })

    expect(provider).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeContext: [expect.objectContaining({ id: 'react-1' })],
      }),
    )
  })

  it('does not crash when no knowledge chunks match', async () => {
    const provider = vi.fn(async () => '설명')

    await expect(
      askTutor({
        question: '자료구조 기초가 뭐야?',
        config: { provider: 'developer', model: 'gemini-flash-latest', apiKey: 'test-key' },
        knowledgeChunks: [],
        provider,
      }),
    ).resolves.toEqual({ answer: '설명' })

    expect(provider).toHaveBeenCalledWith(expect.objectContaining({ knowledgeContext: [] }))
  })

  it('rejects an empty question before calling the provider', async () => {
    const provider = vi.fn()

    await expect(
      askTutor({ question: '  ', config: { provider: 'developer', model: 'x', apiKey: 'k' }, provider }),
    ).rejects.toThrow('Tutor question is required')

    expect(provider).not.toHaveBeenCalled()
  })
})
