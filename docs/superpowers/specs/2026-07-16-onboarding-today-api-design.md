# 관심사 온보딩과 오늘의 깸 카드 API 설계

- 작성일: 2026-07-16
- 상태: 구현 전 확정 설계
- 기준 문서: `docs/plan/api-spec.md`, `docs/plan/content_strategy.md`, `docs/plan/04-scenario-ia.md`, `docs/DEVELOPMENT.md`

## 1. 목표

사용자가 앱에 처음 들어와 관심사를 저장하고, 다음 접속에는 온보딩을 건너뛴 뒤 저장한 관심사에 맞는 오늘의 깸 카드 1~3개를 보는 흐름을 완성한다.

이번 범위의 사용자 흐름은 다음과 같다.

```text
앱 시작
→ 관심사 저장 이력 조회
→ 미저장 사용자는 관심사 1~3개 선택·저장
→ 관심사 기반 오늘의 깸 카드 1~3개 조회
→ 오늘의 깸 카드 목록 표시
```

## 2. 범위

### 포함

- `replace_user_interests` RPC
- `GET /api/user-interests`
- `POST /api/user-interests`
- `get_recommended_articles` 함수의 MVP 추천 조건 교정
- `GET /api/articles/today`
- 프론트의 익명 Auth, 관심사 온보딩, 오늘의 깸 카드 목록 API 연결
- 관련 단위 테스트, local Supabase 통합 테스트, API smoke test

### 제외

- `GET /api/articles/{articleId}`
- 미션 추천·선택·제출
- 나의 깸 기록 조회
- 읽기 참여 측정
- 날짜별 추천 고정 배정
- 클릭 기반 인기글과 협업 필터링
- AI 추천 이유 생성

글 상세와 미션 흐름은 오늘의 깸 카드 목록이 완성된 다음 구현 단위로 분리한다.

## 3. 현재 상태

### 이미 구현됨

- `GET /api/health`
- `GET /api/interests`
- 공통 `{ code, message, details? }` 에러 처리
- Bearer token 추출과 Supabase Auth 사용자 검증
- 사용자 JWT가 적용된 Supabase client
- RSS 수집 파이프라인과 `ingest_rss_article` RPC
- `get_recommended_articles(p_user_id, p_limit)` 함수의 초기 버전

### 아직 필요함

- `replace_user_interests` RPC가 실제 DB와 migration에 없다.
- 세 사용자 API가 구현되지 않았다.
- 현재 추천 함수가 `partial_free`와 source 정보가 불완전한 글을 허용한다.
- 현재 추천 함수에는 동점 보조 정렬이 없다.
- 프론트 관심사·오늘의 깸 화면은 API가 아니라 임시 상태를 사용한다.

### 현재 데이터 기준

2026-07-16 원격 DB 확인 시 관심사는 21개, article은 10개, 관심사 태그가 붙은 article은 10개다. 현재 자동 수집 콘텐츠는 `IT·개발` 중심이다.

첫 vertical slice는 다음 두 경로를 모두 정상 동작으로 본다.

- `IT·개발` 사용자: 추천 카드 1~3개
- 후보가 없는 관심사 사용자: 오류가 아닌 정상 빈 상태

## 4. 선택한 접근 방식

사용자 흐름을 따라 작은 vertical slice를 순차 구현한다.

```text
실데이터 확인
→ 관심사 교체 RPC
→ 관심사 이력 조회 API
→ 관심사 저장 API
→ 추천 함수 교정
→ 오늘의 글 API
→ 프론트 연결
```

DB 전체를 먼저 만든 뒤 API를 일괄 구현하는 방식은 중간 사용자 흐름 검증이 늦다. 프론트 stub을 먼저 만드는 방식은 실제 동작 우선 원칙과 맞지 않는다. 선택한 순서는 각 단계가 독립적으로 검증되고 다음 단계의 안정된 계약이 된다.

## 5. 데이터와 API 흐름

### 5.1 앱 시작과 온보딩 분기

1. 프론트가 Supabase 익명 세션을 생성하거나 복구한다.
2. 요청할 때마다 현재 세션의 access token을 읽는다.
3. `GET /api/user-interests`를 호출한다.
4. `hasCompletedOnboarding=false`면 관심사 선택 화면으로 이동한다.
5. `true`면 오늘의 깸 화면으로 이동한다.

토큰은 변수에 장기 보관하지 않는다. Auth 외 데이터는 모두 FastAPI `/api`를 거친다.

### 5.2 관심사 저장

1. 프론트가 공개 `GET /api/interests`로 선택 가능한 관심사를 표시한다.
2. 사용자가 서로 다른 관심사 1~3개를 선택한다.
3. `POST /api/user-interests`가 사용자 JWT Supabase client로 `replace_user_interests` RPC를 호출한다.
4. RPC가 모든 입력을 검증한 뒤 기존 행 삭제와 신규 삽입을 한 transaction에서 실행한다.
5. 저장 성공 응답을 받은 뒤에만 오늘의 깸 화면으로 이동한다.

최초 저장과 사용자 설정에서의 재설정은 같은 API와 RPC를 사용한다.

### 5.3 오늘의 깸 카드 조회

1. `GET /api/articles/today?limit=3`이 현재 사용자와 저장 관심사를 확인한다.
2. 관심사가 없으면 추천 함수를 호출하지 않고 온보딩 안내가 포함된 빈 목록을 반환한다.
3. 관심사가 있으면 사용자 JWT client로 추천 함수를 호출한다.
4. 추천 함수가 반환한 article ID와 점수를 기준으로 article, source, interest tag를 batch 조회한다.
5. hydration 조회 결과를 추천 함수 순서대로 재정렬한다.
6. 카드 1~3개와 빈 상태 메시지를 camelCase 응답으로 반환한다.

article별 반복 조회를 하지 않는다. API 응답에는 원문 본문, 문장 배열, AI 요약을 포함하지 않는다.

## 6. DB 계약

### 6.1 `replace_user_interests`

- 인자: `p_interest_ids uuid[]`
- 사용자 ID 인자를 받지 않고 `auth.uid()`만 사용한다.
- 로그인 사용자가 없으면 실패한다.
- ID는 서로 다른 1~3개여야 한다.
- 모든 ID가 존재해야 한다.
- `launch_status`는 `active` 또는 `curated_only`여야 한다.
- 검증 완료 후 기존 관심사를 삭제하고 새 관심사를 삽입한다.
- 검증·삭제·삽입 중 하나라도 실패하면 기존 관심사를 유지한다.
- `SECURITY INVOKER`와 RLS를 사용한다.
- `authenticated`만 실행할 수 있고 `PUBLIC`과 `anon`에는 실행 권한을 주지 않는다.

### 6.2 `get_recommended_articles`

MVP 자동 추천 후보는 다음 조건을 모두 만족해야 한다.

- 사용자 관심사 태그가 하나 이상 일치
- `articles.access_type = 'free'`
- `articles.url_status = 'active'`
- `articles.quality_score >= 0.65`
- source가 존재하고 `trust_level in ('high', 'medium')`
- `default_exposure = 'primary'`
- 해당 사용자가 완료한 `mission_records`가 없음

정렬은 다음 순서다.

```text
total_score desc
→ published_at desc nulls last
→ article_id
```

`published_at=null`의 recency score는 `0.1`이다. `partial_free`는 운영자가 무료 범위를 확인하는 별도 수동 큐레이션 계약이 생기기 전까지 자동 추천하지 않는다.

## 7. API 계약

상세 요청·응답과 상태 코드는 `docs/plan/api-spec.md`를 단일 계약으로 사용한다. 이 설계는 구현 순서와 경계를 보완한다.

### `GET /api/user-interests`

- 인증 필요
- 저장 행이 없으면 `200`, `hasCompletedOnboarding=false`, 빈 배열
- 저장 행이 있으면 `true`와 `displayOrder` 순 관심사
- 저장 후 비활성화된 관심사도 반환하되 `selectable=false`
- 다른 사용자 데이터는 반환하지 않음

### `POST /api/user-interests`

- 인증 필요
- 요청은 `interestIds`만 허용하고 `extra='forbid'`
- 서로 다른 UUID 1~3개
- 성공 `201`
- 형식·개수·중복·존재·상태 오류는 `422`
- 실패 시 기존 선택 유지

### `GET /api/articles/today`

- 인증 필요
- `limit`은 1~3, 기본 3
- 추천 결과 1~3개 또는 정상 빈 목록
- 관심사가 없거나 후보가 없어도 `200`
- 카드 응답은 article/source/tag를 포함하지만 본문은 포함하지 않음
- 추천 이유는 고정 규칙 문구이며 AI로 생성하지 않음

## 8. 확정한 세부 규칙

### 비활성화된 기존 관심사

조회에는 `selectable=false`로 표시한다. 전체 교체 저장 전에 사용자가 비활성 관심사를 명시적으로 해제해야 한다. 서버가 사용자 선택을 묵시적으로 제거하지 않는다.

### 추천 이유 관심사 tie-break

한 글이 여러 사용자 관심사에 같은 점수로 매칭되면 다음 순서로 하나를 선택한다.

```text
confidence desc
→ interests.display_order asc
→ interest_id
```

### 빈 상태 메시지

선택 관심사 중 `displayOrder`가 가장 빠르면서 `emptyStateMessage`가 비어 있지 않은 값을 사용한다. 해당 메시지가 없으면 공통 빈 상태 문구를 반환한다.

## 9. 오류 처리

- 모든 에러는 `{ code, message, details? }` 형식이다.
- 토큰 없음·만료·위조는 `401`이다.
- Pydantic 필드 검증은 `422`다.
- RPC의 입력 검증 실패는 SQL·내부 메시지를 노출하지 않고 `422`로 변환한다.
- 추천 후보 부재는 오류가 아니라 `200` 빈 목록이다.
- 예상하지 못한 DB/RPC 오류는 내부 정보를 숨긴 `500`이다.

## 10. 검증 전략

### 단위 테스트

- 요청 schema의 개수·중복·UUID·extra 검증
- snake_case에서 camelCase 응답 변환
- 온보딩 완료 여부 계산
- 추천 결과 순위 복원
- 추천 이유 tie-break
- 빈 상태 메시지 선택
- API 오류 mapping

외부 HTTP·DB·RPC 경계는 단위 테스트에서 mock할 수 있다.

### local Supabase 통합 테스트

- 관심사 최초 저장과 재설정
- 빈 배열·중복·4개·없는 ID·비활성 ID에서 rollback
- 사용자 A/B RLS 격리
- `PUBLIC`·`anon` RPC 실행 거부
- partial free, low trust, non-primary, source null, broken, 품질 미달 제외
- 완료한 글 제외와 사용자별 격리
- `published_at=null` recency `0.1`
- 동점 정렬 결정론

DB 제약, transaction 원자성, RLS·RPC 권한, 동시성은 mock으로 완료 판정하지 않는다.

### API smoke와 화면 검증

- 무토큰 `401`
- 미저장 사용자 온보딩 이동
- 저장 성공 후 재조회 `hasCompletedOnboarding=true`
- `IT·개발` 사용자에게 실제 수집 카드 1~3개
- 후보 없는 관심사의 empty state
- 카드 응답에 본문이 없음
- loading, error, empty, list 네 화면 상태

## 11. 구현 순서와 완료 게이트

1. 실제 source, article, tag 데이터와 migration 적용 상태 확인
2. `replace_user_interests` migration과 local Supabase 검증
3. `GET /api/user-interests`와 인증·RLS 검증
4. `POST /api/user-interests`와 rollback·재설정 검증
5. 추천 함수 교정 migration과 후보 필터·정렬 검증
6. `GET /api/articles/today`와 카드 조립·빈 상태 검증
7. 프론트 익명 Auth와 세 API 연결
8. 실제 사용자 흐름 smoke test

각 단계는 독립적으로 테스트와 리뷰를 통과한 뒤 다음 단계로 진행한다.

## 12. 권장 커밋 단위

1. `feat: 관심사 전체 교체 RPC 추가`
2. `feat: 사용자 관심사 조회 API 추가`
3. `feat: 사용자 관심사 저장 API 추가`
4. `fix: 오늘의 글 추천 함수 조건 수정`
5. `feat: 관심사 기반 오늘의 글 API 추가`
6. `feat: 온보딩과 오늘의 글 API 연결`
7. `docs: API 검증 상태 갱신`

각 기능 커밋에는 해당 단위 테스트 또는 local Supabase 통합 테스트를 함께 포함한다.
