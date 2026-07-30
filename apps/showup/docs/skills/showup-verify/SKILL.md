---
name: showup-verify
description: ShowUp 프로젝트 검증 자동화 — lint, typecheck, build, 단위 테스트를 한 번에 실행
---

# ShowUp 검증 Agent

ShowUp 프로젝트의 모든 검증을 한 번에 실행한다.

## 사전 조건

- 작업 디렉토리: `/Users/minseokchae/hub`
- Node.js 설치됨
- npm dependencies 설치됨 (`npm install`)

## 검증 순서

1. **Lint**: `npm run lint --workspace showup`
2. **TypeCheck**: `npm run typecheck --workspace showup`
3. **Build**: `npm run build --workspace showup`
4. **단위 테스트**:
   - `npm run verify:risk --workspace showup`
   - `npm run verify:phone --workspace showup`
   - `npm run verify:search --workspace showup`
   - `npm run verify:seed --workspace showup`

## 결과 해석

- **lint**: warning 0, error 0 이어야 PASS
- **typecheck**: tsc -b 에러 없어야 PASS
- **build**: vite build "built in" 메시지 나와야 PASS
- **단위 테스트**: 각 스크립트 exit code 0이어야 PASS

## 실패 시 대응

1. lint warning → 미사용 변수/import 제거
2. typecheck 에러 → 타입 불일치 수정
3. build 에러 → import 경로, 모듈 해석 확인
4. 단위 테스트 실패 → 테스트 케이스와 구현 코드 비교

## 검증 완료 보고 형식

```
검증 결과:
- lint: PASS (warning 0, error 0)
- typecheck: PASS
- build: PASS (1.xx s)
- risk test: PASS (N개)
- phone test: PASS (N개)
- search test: PASS (N개)
- seed test: PASS (N개)
```