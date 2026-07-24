// Vitest 전역 셋업 — 모든 테스트 파일 실행 전에 로드된다 (vite.config.ts의 setupFiles).
// jest-dom: toBeInTheDocument() 같은 DOM 단언 matcher를 expect에 추가.
import '@testing-library/jest-dom/vitest'

// 매 테스트 후 렌더된 DOM을 비운다 — 이전 테스트의 화면이 다음 테스트를 오염시키지 않게.
// (globals: true 설정 없이는 RTL의 자동 cleanup이 등록되지 않아 직접 건다)
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
afterEach(cleanup)
