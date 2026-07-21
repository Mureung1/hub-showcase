---
name: backend-testing
description: 백엔드(backend/) 유닛테스트·통합테스트를 작성할 때 사용. Vitest + Supertest로 docs/testing.md를 단일 진실 소스 삼아 순수 함수는 유닛테스트, 라우트는 GitHub mock + 실제 Supabase DB로 통합테스트를 작성한다. 새 서비스 함수·라우트를 추가하거나 기존 로직을 리팩터링해 회귀 테스트가 필요할 때 항상 먼저 실행.
---

# 백엔드 테스트 스킬

`docs/testing.md`를 **단일 진실 소스**로 삼아 백엔드 유닛/통합테스트를 작성하는 스킬.

## 실행 순서

1. **`docs/testing.md`를 먼저 읽는다.** 규칙이 갱신됐을 수 있으므로 항상 최신 문서를 기준으로 한다.
2. 테스트 대상이 **순수 함수**(DB·GitHub 호출 없음)인지 **라우트/DB·외부 API를 물고 있는 로직**인지 구분한다.
   - 순수 함수 → `backend/tests/unit/<대상>.test.js`
   - 라우트 → `backend/tests/integration/<리소스>.test.js`
3. 대상 함수가 파일 내부에 갇혀 있고 테스트할 가치가 있다면 `export`를 추가한다 (동작 변경 없는 export 추가만 — 참고: `code-convention` 스킬의 레이어 규칙과 충돌하지 않는지 확인).
4. 통합테스트는 `vi.mock('.../githubService.js', ...)`으로 GitHub 호출을 대체하고, DB는 실제 연결을 쓰되 `beforeAll`/`afterAll`로 생성·정리한다.
5. `npm run test:backend`(루트) 또는 `backend/`에서 `npm test`로 실행해 통과를 확인한다.
6. 새 라우트라면 `api-smoke-test` 스킬로 실제 기동 검증도 별도로 거친다 (통합테스트가 대체하지 않음).

## 핵심 요약 (상세는 testing.md)

- 유닛테스트: 순수 함수만, mock 최소화. 참고: `tests/unit/validators.test.js`, `tests/unit/recommendationService.test.js`
- 통합테스트: GitHub는 항상 mock, DB는 실제 Supabase — 생성한 데이터는 `afterAll`에서 반드시 정리하고 `prisma.$disconnect()`. 참고: `tests/integration/recommendations.test.js`
- 응답 검증은 상태 코드뿐 아니라 `error.code`까지 확인한다.
- 테스트용 githubId는 실제 계정에 의존하지 않는 전용 식별자(예: `vitest-test-user`)를 쓰고 `Analysis` 캐시를 직접 심어 GitHub 프로필 조회를 생략한다.

## 하지 말 것
- 유닛테스트에서 실제 DB/네트워크 호출.
- 통합테스트에서 실제 GitHub API 호출.
- 통합테스트가 만든 레코드를 정리하지 않고 끝내기.
- 상태 코드만 확인하고 에러 코드/응답 형태를 검증하지 않기.
