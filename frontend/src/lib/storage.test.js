import { describe, it, expect, beforeEach, vi } from 'vitest'

// request()를 가로채 어떤 body로 나가는지만 본다(네트워크는 타지 않는다).
const calls = []
vi.mock('./api.js', () => ({
  request: (path, options = {}) => {
    calls.push({ path, ...options })
    return Promise.resolve({ id: 'server-uuid' })
  },
}))

const { saveDraft } = await import('./storage.js')

beforeEach(() => {
  calls.length = 0
})

describe('saveDraft 의 status 처리', () => {
  it('status를 주지 않으면 초안으로 저장한다', async () => {
    await saveDraft({ id: 'doc-1', title: '초안' })
    expect(calls[0].body.status).toBe('draft')
  })

  // 발행 문서를 고치는 중에도 status를 초안으로 덮어쓰면 자동저장 한 번에
  // 문서가 조용히 발행 취소되어 아카이브에서 사라진다.
  it('발행 문서를 고치는 중이면 발행 상태를 유지한다', async () => {
    await saveDraft({ id: 'doc-1', title: '수정', status: 'published' })
    expect(calls[0].body.status).toBe('published')
    expect(calls[0].method).toBe('PATCH')
  })
})
