import '@testing-library/jest-dom'

// 테스트 환경에서 fetch 호출이 실패해도 조용히 처리
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  } as Response)
)
