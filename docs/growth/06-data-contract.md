# 6. 데이터 계약 — 타입을 한 군데로 모았다

Mock으로 흐름을 만들 때는 UI에서 대충 타입을 만들어 썼다. 근데 나중에 실제 API랑 DB가 붙으면 이 모양들이 서로 안 맞을 게 뻔했다. 그래서 계약을 한 군데로 모으기로 했다.

## ① 진행한 내용

- 공유 패키지 `packages/shared` 신설 — UI 임시 타입을 Zod 스키마로 이전. Enum 6개, 엔티티 6개, 에러 코드 목록, 상태 간 교차 검증(superRefine).
- Mock 데이터도 반환 직전 스키마 검사 — 계약 위반 시 조용히 넘어가지 않고 바로 터지게.
- 일부러 데이터를 깨뜨려 검증 배너 뜨는 것 확인 후 원복.

## ② 추가로 배운 개념

- Zod랑 `z.infer`(스키마에서 타입을 뽑아내기). `superRefine`으로 필드 사이 규칙을 강제하기.
- 외부에서 온 데이터는 검증 전까지 `unknown`으로 취급한다는 원칙.
- npm Workspaces(모노레포)에서 web과 api가 같은 공유 패키지를 쓰는 구조.
- camelCase(코드)와 snake_case(DB) 변환을 한 경계에서만 하기.

## ③ 꼭 공부할 개념

- 런타임 스키마 검증과 타입 안전(Zod)
- 스키마에서 타입 파생(z.infer), 외부 데이터 unknown 경계
- 모노레포와 npm workspaces, 공유 패키지 계약
- 계약(Contract) 기반 경계, 직렬화 변환(camelCase↔snake_case)

**학습 자료**

- [Zod — Documentation](https://zod.dev/)
- [npm — Workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## ④ 참고 링크 — 직접 만든 문서

- `docs/specs/SPEC-SCHEMA-001-core-contracts.md`
