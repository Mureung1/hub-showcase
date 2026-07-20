# Run Report: PERF-002 3D lazy loading

## 1. 변경 결과

- `SceneWorkspace`와 `SelectedStorefrontLayer`를 `React.lazy()` 경계로 분리했다.
- 3D 장소를 여는 동안 명시적인 status를 표시하고, 지도 위 storefront loader는 시각 방해 없이 기다린다.
- 비동기 상태 변경으로 점포 전체보기 상태가 잘못 접히던 test 경계도 store ID 기반으로 안정화했다.

## 2. Build 비교

- main JS: 약 302.43 kB -> 289.03 kB
- 별도 chunk: `SceneWorkspace` 13.12 kB, `SelectedStorefrontLayer` 1.60 kB
- Three 725.38 kB와 Spark 5,052.64 kB는 build 산출물에는 존재하지만 초기 main chunk의 static import가 아니다.
- MapLibre 1,027.74 kB는 제품 첫 화면의 핵심 지도이므로 이번 Task에서 유지했다.

## 3. 검증

- App tests: 11개 통과
- TypeScript typecheck와 production build: 통과
- FE tests: 21 files, 65 tests 통과
- TypeScript typecheck, lint, production build: 통과
- Task Packet 검사: 58개 통과
