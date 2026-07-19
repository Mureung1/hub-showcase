# Run Report: WEB-017 모바일 지도 중심 drawer

## 1. 변경 결과

- `useCompactMap()` 결과가 true인 첫 render에서는 LNB와 RNB를 닫고 시작한다.
- 지도 toolbar의 `분석 조건 열기`, `분석 결과 열기`로 필요한 drawer만 연다.
- 두 패널은 bottom drawer이며 각각 자신의 내용만 scroll한다.
- 닫은 뒤에는 기존 UX-002 focus 정책으로 해당 열기 버튼에 focus가 돌아간다.
- 숨겨졌던 Docs 링크는 mobile icon control로 유지한다.

## 2. 검증

- App test: mobile media query에서 map-first 상태와 Docs 진입 확인
- 전체 FE test: 통과
- TypeScript typecheck, ESLint, production build: 통과
- Task Packet 검사: 통과
- 390x844 browser smoke: 초기 두 panel 닫힘, LNB 열기·닫기, 닫은 뒤 trigger focus 복귀 확인
