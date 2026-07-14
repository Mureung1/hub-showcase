# API Smoke Test

백엔드를 바꾼 뒤 최소 확인. 전부 `curl`로 돌린다.

```bash
BASE=http://localhost:8000
```

## 구현됨

### GET /api/health

```bash
curl -s $BASE/api/health
```

기대: `200` / `{"status":"ok"}`

### GET /api/interests

```bash
curl -s $BASE/api/interests | python3 -m json.tool | head -20
```

기대

- `200`
- 21건
- `displayOrder` 오름차순 (1, 2, 3, …)
- 필드가 **camelCase** (`displayOrder`, `launchStatus`, `riskLevel`, `emptyStateMessage`)
- `launchStatus`가 `curated_only`인 항목만 `emptyStateMessage`가 채워져 있다

실패 신호

- `display_order` 같은 snake_case가 보이면 → 응답 스키마의 alias 설정이 깨졌다
- 500 → `backend/.env`에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`가 다 있는지 확인

### /docs

```bash
curl -s $BASE/openapi.json | python3 -c "import json,sys; print(sorted(json.load(sys.stdin)['paths']))"
```

기대: 등록된 모든 라우트가 나온다. 라우터를 추가한 뒤 기존 라우트가 사라지지 않았는지 보는 회귀 확인이다.

## 미구현 (구현 시 이 기준을 통과시킨다)

### POST /api/user-interests

| 요청 | 기대 |
| --- | --- |
| 유효한 사용자 JWT + `interestIds` 3개 | `201`, `user_interests`에 3행 |
| **토큰 없음** | **`401`. 저장되지 않는다** |
| **만료/위조 토큰** | **`401`** |
| 본문에 `userId`를 넣어 보냄 | **무시된다.** `user_id`는 토큰에서만 뽑는다 |
| 존재하지 않는 `interestId` | `400` 또는 `422`. FK 위반이 500으로 새면 안 된다 |
| 같은 관심사 중복 전송 | 중복 저장되지 않는다 (PK가 `(user_id, interest_id)`) |
| 빈 배열 | `400` 또는 `422` |

### GET /api/articles/today

| 요청 | 기대 |
| --- | --- |
| 사용자 JWT | `200`, 사용자 관심사 기반 1~3건 |
| 토큰 없음 | `401` |
| 관심사를 아직 저장하지 않은 사용자 | 빈 배열 또는 안내. 500이 나면 안 된다 |

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
