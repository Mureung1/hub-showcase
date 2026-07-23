# 즐겨찾기 토글 TDD 기록

작성일: 2026-07-23

## 목표와 완료 기준

저장된 포트폴리오의 별 버튼을 누르면 React가 Express PATCH API를 호출하고, 서버가
Supabase의 `is_favorite` 값을 바꾼 뒤 반환된 `isFavorite` 값으로 목록 state를 갱신한다.

- `isFavorite`은 boolean만 허용한다.
- 서버 응답이 성공한 뒤에 화면 상태를 변경한다.
- 목록과 상세 응답은 DB의 `is_favorite`를 `isFavorite`로 변환한다.
- DB migration은 기존 행을 `false`로 유지하고 service role에 update 권한을 준다.

사용한 절차는 [test-first-feature Skill](../.agents/skills/test-first-feature/SKILL.md)에,
반복 검증 절차는 [feature-verifier Agent](../.agents/agents/feature-verifier.md)에 저장했다.

## Red → Green 기록

### 1. Supabase 서비스 단위 테스트

Given: 포트폴리오 UUID와 `true`가 주어진다.  
When: 즐겨찾기 서비스 함수를 호출한다.  
Then: Supabase에 `PATCH { is_favorite: true }`를 보내고 `isFavorite: true`를 반환한다.

**Red**

```bash
cd server
node --test test/portfolios.service.test.js
```

실패 이유: `portfolios.service.js`가 `updatePortfolioFavorite`을 export하지 않았다.

**Green**

- `META_COLUMNS`에 `is_favorite` 추가
- `mapRow()`에서 `isFavorite`로 변환
- `updatePortfolioFavorite()`에서 Supabase PATCH와 404 처리
- 결과: 서비스 테스트 5개 통과

### 2. Express API 통합 테스트

Given: 올바른 UUID와 `{ "isFavorite": true }`가 주어진다.  
When: `PATCH /api/portfolios/:id/favorite`를 호출한다.  
Then: 200과 갱신된 portfolio를 반환한다.

**Red**

```bash
cd server
node --test test/portfolios.api.test.js
```

실패 이유: 라우트가 없어 기대값 200 대신 404가 반환됐다.

**Green**

- PATCH 라우트와 controller 연결
- UUID와 strict boolean 입력 검증
- boolean이 아닌 값은 Supabase 호출 전에 400으로 거절하는 회귀 테스트 추가
- 결과: API 통합 테스트 6개 통과

### 3. React API client 단위 테스트

Given: 포트폴리오 UUID와 다음 즐겨찾기 값이 주어진다.  
When: client API의 `updateFavorite()`을 호출한다.  
Then: 올바른 URL과 JSON body로 PATCH하고 갱신 결과를 반환한다.

**Red**

```bash
cd client
npm test -- --run src/features/portfolio/portfolioApi.test.js
```

실패 이유: `api.updateFavorite is not a function`.

**Green**

- 실제 API와 메모리 Mock에 `updateFavorite()` 추가
- React 목록에 별 버튼, 행별 변경 중 문구, 성공 후 state 교체와 오류 메시지 연결
- 결과: client API 테스트 5개 통과

## 완성된 데이터 흐름

```text
별 버튼 클릭
  → client updateFavorite(id, !isFavorite)
  → PATCH /api/portfolios/:id/favorite
  → UUID · boolean 검증
  → Supabase UPDATE is_favorite
  → snake_case를 camelCase로 변환
  → 성공 응답으로 해당 React 목록 항목 교체
```

## 전체 검증

| 검증                          | 결과                                             |
| ----------------------------- | ------------------------------------------------ |
| Client unit tests             | 14개 통과                                        |
| Server unit·integration tests | 11개 통과                                        |
| ESLint                        | 통과                                             |
| Vite production build         | 통과                                             |
| Skill 공식 validator          | 통과                                             |
| 실제 Supabase 읽기            | `42703`: `is_favorite` migration 미적용으로 보류 |

실제 DB에는 아직 `is_favorite` 컬럼이 없어 라이브 영속성 검증은 통과로 기록하지 않았다.
[`202607230001_add_portfolio_favorite.sql`](../supabase/migrations/202607230001_add_portfolio_favorite.sql)을
Supabase SQL Editor에서 적용한 뒤, 별 상태 변경 → 새로고침 → 서버 재시작 후 유지까지 확인해야
완전한 E2E가 된다.

## 기능 검증 Agent 결과

`feature-verifier` Agent는 전체 구조와 테스트를 독립적으로 확인하고 **PARTIAL**로 판정했다.

- PASS: React → PATCH API → controller/service → Supabase query → camelCase 응답 흐름
- PASS: UUID와 boolean 검증, client 14개·server 11개 테스트, lint, build
- 개선 반영: Agent가 발견한 단일 pending id의 동시 요청 문제를 행별 pending map으로 변경
- PARTIAL: 실제 Supabase에는 migration이 아직 적용되지 않아 라이브 UPDATE·재조회는 미검증
- 미검증: 별 버튼 클릭 후 화면 렌더 변화는 코드 추적으로 확인했지만 컴포넌트 테스트는 없음

## 배운 점

- Red는 단순히 테스트가 실패하는 것이 아니라, 구현하려는 행동이 없어서 실패해야 한다.
- 서비스 단위 테스트는 query와 매핑을 빠르게 검증하고, Express 통합 테스트는 라우트와 입력
  검증이 실제 HTTP 경계에서 연결되는지 확인한다.
- 외부 DB를 stub한 통합 테스트와 실제 Supabase 영속성 검증은 서로 대체하지 않는다.
- Green 이후에만 UI, 문서, migration을 연결하니 실패 원인을 작은 범위에서 찾을 수 있었다.
