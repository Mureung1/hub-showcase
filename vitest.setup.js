// 모든 테스트 파일 실행 전에 한 번씩 로드된다.
// toBeInTheDocument / toHaveTextContent 같은 DOM 전용 매처를 expect에 추가한다.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 테스트 간 DOM이 남아 서로 간섭하지 않도록 정리
afterEach(() => {
  cleanup()
})
