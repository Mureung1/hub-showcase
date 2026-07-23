// vitest 각 테스트 전에 불러오는 설정. toBeInTheDocument 같은 DOM 매처를 expect에 붙인다.
// vitest 전용 진입점을 써야 한다(일반 진입점은 전역 expect를 찾는데 vitest엔 전역이 없어 터짐).
import '@testing-library/jest-dom/vitest'
