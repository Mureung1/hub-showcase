# API Smoke Test

백엔드를 바꾼 뒤 최소 확인.

```bash
cd backend && uv run fastapi dev app/main.py   # 백엔드를 먼저 띄운다
uv run scripts/smoke_api.py                    # 다른 터미널에서

# 인증이 필요한 라우트(user-interests, articles/today)까지 확인하려면 토큰을 넘긴다.
uv run scripts/smoke_api.py --token "$TEST_ACCESS_TOKEN"
```

**눈으로 훑지 않고 판정한다.** `curl | head -20`은 21건인지 20건인지, 뒤쪽 정렬이 깨졌는지 알 수 없다. 스크립트가 상태 코드·개수·**전체 정렬**·필드명을 실제로 비교하고, 실패하면 기대값과 실제값을 함께 출력한다.

## 스크립트가 판정하는 것

### GET /api/health

- 상태 코드 `200`
- 본문이 정확히 `{"status":"ok"}`

### GET /api/interests

- 상태 코드 `200`
- 비어 있지 않은 배열
- **필드명이 camelCase** — `id`, `name`, `displayOrder`, `launchStatus`, `riskLevel`, `emptyStateMessage`
  - `display_order` 같은 snake_case가 새어 나오면 응답 스키마의 alias 설정이 깨진 것이다
- **`displayOrder` 오름차순 — 배열 전체로 판정**
  - 깨졌으면 몇 번째 인덱스에서 깨졌는지 출력한다
- **`hidden`, `preparing`이 응답에 없다**
  - 프론트에서 숨겨도 네트워크 응답에는 그대로 실려 나간다. 백엔드가 걸러야 한다
- **`emptyStateMessage`는 `curated_only`에만 존재**

### 회귀 — 라우트 등록

- `/docs`가 `200`
- `/openapi.json`에 `/api/health`, `/api/interests`, `/api/user-interests`, `/api/articles/today`가 모두 등록되어 있다
- 라우터를 추가한 뒤 기존 라우트가 사라지지 않았는지 보는 확인이다

### 인증 필요 라우트 — 무토큰 401

- `GET /api/user-interests`, `GET /api/articles/today`를 토큰 없이 호출하면 `401`

### `--token` 전달 시 추가 판정

- `GET /api/user-interests`가 유효 토큰으로 `200`
- `GET /api/articles/today?limit=0`, `?limit=4`가 `422`
- `GET /api/articles/today`가 `200`, `items` 배열과 `emptyStateMessage` 필드를 모두 가짐
- 카드 응답에 `body`/`sentences`/`summary`가 없음

## 실패 시

```
[FAIL] displayOrder 오름차순 정렬
       기대: 오름차순
       실제: index 5=7 다음이 index 6=6
```

**어떤 값이 달랐는지 바로 보인다.** 다시 조회해서 눈으로 찾을 필요가 없다.

`백엔드에 연결할 수 없다`가 뜨면 백엔드가 안 떠 있는 것이다.

500이 뜨면 `backend/.env`에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`가 다 있는지 확인한다.

## GET /api/user-interests

| 요청 | 기대 |
| --- | --- |
| 유효한 사용자 JWT, 저장 이력 없음 | `200`, `{ "hasCompletedOnboarding": false, "interests": [] }` |
| 유효한 사용자 JWT, 저장 이력 있음 | `200`, `hasCompletedOnboarding=true`, `displayOrder` 오름차순 |
| `hidden`/`preparing`으로 바뀐 기존 관심사 | 응답에 포함되지만 `selectable=false` |
| **토큰 없음** | **`401`** |

## POST /api/user-interests

**동작 — 전체 교체.** `replace_user_interests` RPC 한 번으로 기존 관심사를 지우고 새로 넣는다. REST delete/insert 두 번이 아니다. 같은 요청을 반복해도 결과가 같다.

| 요청 | 기대 |
| --- | --- |
| 유효한 사용자 JWT + `interestIds` 1~3개(서로 다른 선택 가능 ID) | `201`, `{ "interestIds": [...] }` |
| 이어서 `interestIds` 2개로 재요청 | **`user_interests`가 2행이 된다** (5행이 아니다) |
| **토큰 없음** | **`401`. 저장되지 않는다** |
| **만료/위조 토큰** | **`401`** |
| **본문에 `userId`를 넣어 보냄** | **`422 VALIDATION_ERROR`.** 요청 스키마에 없는 필드는 거부한다 (`extra="forbid"`) |
| 빈 배열 | `422 VALIDATION_ERROR` |
| **`interestIds`가 4개 이상** | **`422 VALIDATION_ERROR`.** 최대 3개다 |
| 같은 관심사 중복 전송 | `422 VALIDATION_ERROR` |
| 존재하지 않는 `interestId` | `422 VALIDATION_ERROR`. RPC 내부 검증 오류이며 SQL 원문·내부 메시지를 노출하지 않는다 |
| **`hidden`/`preparing` 관심사의 id** | **`422 VALIDATION_ERROR`.** 선택 불가능한 관심사는 저장하지 않는다 |
| **다른 사용자 세션으로 조회** | **`0행`. RLS가 막는다** |

`user_id`는 **토큰에서만** 뽑는다. RPC는 `p_interest_ids`만 인자로 받고 `auth.uid()`로 사용자를 식별한다. 요청 본문의 값을 신뢰하지 않는다.

**프론트엔드의 제한은 방어가 아니다.** 관심사 최대 3개, 선택 가능한 관심사만 허용하는 규칙은 화면에서 막더라도 개발자 도구로 요청을 조작하면 뚫린다. **백엔드와 RPC에서 같은 규칙을 다시 검사한다.**

`extra="forbid"`는 **요청 스키마에만** 건다. 응답 스키마에 걸면 DB에 컬럼이 추가될 때 깨진다.

**저장 실패 시 완료 화면으로 넘기지 않는다.** RPC 내부에서 검증·삭제·삽입이 한 트랜잭션으로 실행되므로 실패하면 기존 관심사가 그대로 유지된다. API smoke는 이 상태 코드 계약만 판정하고, **트랜잭션 원자성·RLS 격리·RPC 실행 권한(`anon`/`authenticated`)은 API mock 테스트가 아니라 local Supabase pgTAP(`supabase/tests/replace_user_interests_test.sql`)로 판정한다.**

## GET /api/articles/today

| 요청 | 기대 |
| --- | --- |
| 유효한 사용자 JWT, 관심사 저장됨(추천 후보 있음) | `200`, `items` 1~3건, `emptyStateMessage: null` |
| 유효한 사용자 JWT, 관심사를 아직 저장하지 않음 | `200`, `items: []`, 온보딩 안내 `emptyStateMessage`. RPC를 호출하지 않는다 |
| 유효한 사용자 JWT, 관심사는 있지만 추천 후보 없음 | `200`, `items: []`, 선택 관심사 기준 `emptyStateMessage`. `500`이 아니다 |
| **토큰 없음** | **`401`** |
| `limit=0` 또는 `limit=4` | `422 VALIDATION_ERROR`. 허용 범위는 `1..3` |
| 카드 응답 | `body`, `sentences`, `summary` 등 원문·요약 필드가 없다 |

추천 후보 필터(`access_type=free`, `url_status=active`, `quality_score>=0.65`, source `trust_level in (high,medium)`, `default_exposure=primary`, 완료 글 제외)와 동점 정렬 결정론은 API mock 테스트가 아니라 local Supabase pgTAP(`supabase/tests/recommended_articles_test.sql`)로 판정한다.

## 미구현 (구현 시 이 기준을 통과시킨다)

### POST /api/mission-records

| 요청 | 기대 |
| --- | --- |
| 유효 토큰 + 정상 본문 | `201` |
| **토큰 없음** | **`401`** |
| **다른 사용자의 `userId`를 본문에 넣음** | **저장되지 않는다** |
| `missionType`이 목록 밖의 값 | `422`. DB의 check 제약은 `question`, `rebuttal`, `connection`, `expression`이다 |
| `userAnswer`가 빈 문자열 | `422`. DB 제약이 `char_length(user_answer) > 0`이다 |
| `anchorType`이 목록 밖의 값 | `422`. `whole_content`, `highlight`, `timestamp`, `user_quote` |

## 도메인 값의 기준은 DB다

서비스 화면과 API는 DB의 check 제약을 그대로 따른다.

| 대상 | 허용값 |
| --- | --- |
| `mission_records.mission_type` | `question`, `rebuttal`, `connection`, `expression` |
| `mission_records.anchor_type` | `whole_content`, `highlight`, `timestamp`, `user_quote` |
| `interests.launch_status` | `active`, `curated_only`, `hidden`, `preparing` |
| `articles.content_type` | `article`, `blog`, `video` |
| `articles.source_type` | `news`, `official_blog`, `expert_article` |

`frontend/src/components/ProjectInfo.tsx`는 서비스 화면이 아니라 **프로젝트 소개 페이지**다. 자체적으로 쓰는 이름(`rebut`, `connect`, `express`)이 있지만 DB와 무관하며, 서비스 도메인의 기준이 아니다.
