// toBeInTheDocument 같은 DOM 전용 matcher를 expect에 추가한다
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 각 테스트가 서로 영향을 주지 않도록 렌더링 결과와 저장소를 정리한다
afterEach(() => {
  cleanup()
  localStorage.clear()
})
