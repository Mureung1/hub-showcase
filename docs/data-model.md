# 데이터 모델 설계

내일 Supabase에 실제 테이블을 만들기 위한 설계 문서다. 기획서 §5의 데이터 구조 초안을 컬럼·타입·제약 수준으로 구체화하고, 프론트 mock과의 매핑을 정리한다.

## 원칙

1. **mock 스키마 = DB 스키마.** 프론트의 목데이터(`frontend/src/data/`, `frontend/src/lib/storage.js`)와 DB 컬럼을 1:1로 대응시켜, 백엔드 연동이 "데이터 출처 교체"로 끝나게 한다 (CLAUDE.md 아키텍처 규칙).
2. **지금 만드는 것과 나중에 만드는 것을 구분한다.** 2주차 수직슬라이스는 `documents` 단일 테이블(2주차 계획 결정, [`backend/db/schema.sql`](../backend/db/schema.sql)). 나머지 테이블은 해당 기능 주차에 만든다.

## 테이블 설계

### 1차 — 내일 Supabase에 만들 것

**`documents`** — 단일 테이블, `sections`/`comments`는 JSONB 컬럼. DDL은 [`backend/db/schema.sql`](../backend/db/schema.sql)에 이미 준비되어 있다 (Supabase SQL Editor에 붙여넣어 실행).

| 컬럼 | 타입 | 제약 | 비고 |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| author_id | uuid | nullable | 로그인 도입 전까지 익명 placeholder |
| author_name | text | | mock의 `author` 표시용 |
| type | text | default '역기획' | 역기획 \| 순기획 |
| template_id | text | | system \| content \| uiux \| free |
| status | text | check: draft \| published | |
| title | text | | |
| game_tag / job_tag / system_tag | text | | 발행 시 game+job 필수 (check 제약 `publish_requires_tags`) |
| challenge_id | text | nullable | 챌린지 제출작이면 설정 |
| feedback_wanted | boolean | default false | |
| likes / bookmarks | integer | default 0 | 카운트 캐시 (원본은 4차 reactions) |
| sections | jsonb | default '[]' | `[{ id, heading, content, guide_key? }]` |
| comments | jsonb | default '[]' | `[{ id, section_id, author_id?, is_ai, content, created_at }]` |
| created_at / updated_at / published_at | timestamptz | | updated_at은 트리거 자동 갱신 |

인덱스: `(status, published_at desc)` — 아카이브 목록, `(game_tag)` — 태그 필터.

### 2차 — 3주차(커뮤니티 코멘트) 때 분리 검토

**`comments`** — 지금은 documents.comments JSONB. 다음 조건 중 하나라도 걸리면 테이블로 분리한다:
- 코멘트 단독 조회가 필요할 때 (알림: "내 문서에 새 코멘트", 마이페이지 "내가 쓴 코멘트")
- 다른 사람이 코멘트를 쓸 때 (JSONB는 문서 행 전체를 업데이트해야 해서 동시 쓰기 충돌 위험)

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK |
| document_id | uuid | FK → documents.id, on delete cascade |
| section_id | text | JSONB sections 안의 id와 매칭 (sections를 정규화하지 않는 한 FK 불가 — 분리의 대가) |
| author_id | uuid | FK → auth.users, nullable (is_ai=true면 null) |
| is_ai | boolean | default false |
| content | text | not null |
| created_at | timestamptz | default now() |

### 3차 — 해당 기능 주차에 생성

**`challenges`** (3주차, 지금은 `frontend/src/data/challenges.js` 시드)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | text | PK (ch-1, ch-2 …) |
| status | text | ongoing \| ended (또는 날짜로 계산) |
| title / description | text | |
| template_id | text | 챌린지 지정 템플릿 |
| start_at / submit_deadline / feedback_deadline | date | 마감 전 제출작 비공개 규칙의 기준 |
| best_doc_id | uuid | FK → documents, nullable |

**`reactions`** (3주차 — 좋아요·북마크. 지금은 상세 페이지 임시 state)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid | PK |
| document_id | uuid | FK → documents |
| user_id | uuid | FK → auth.users |
| type | text | like \| bookmark |
| | | unique(document_id, user_id, type) — 중복 방지 |

**`ai_feedback_logs`** (4주차 — LLM 일일 호출 제한용)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK |
| document_id | uuid | FK, nullable(초안일 수 있음) |
| called_at | timestamptz | 일일 카운트 기준 |

**`users`** — 별도 테이블을 만들지 않고 **Supabase Auth(`auth.users`) + `profiles` 테이블**(id FK, nickname, bio)로 대체한다. 로그인 도입(이월된 1주차 P0) 때 함께 생성.

## 프론트 mock ↔ DB 매핑

프론트는 camelCase, DB는 snake_case. 변환은 백엔드 API 계층에서 한 번만 한다.

| 프론트 (documents.js / storage.js) | DB (documents) |
|---|---|
| `id` (`draft-…` / `doc-…` 문자열) | `id` (uuid — 연동 시 서버 발급으로 교체) |
| `author` | `author_name` |
| `templateId` | `template_id` |
| `gameTag` / `jobTag` / `systemTag` | `game_tag` / `job_tag` / `system_tag` |
| `challengeId` | `challenge_id` |
| `feedbackWanted` | `feedback_wanted` |
| `publishedAt` (yyyy-mm-dd 문자열) | `published_at` (timestamptz) |
| `sections[].{id, heading, content}` | `sections` JSONB 동일 구조 |
| `comments[].{id, sectionId, author, isAi, content, createdAt}` | `comments` JSONB (`section_id`, `is_ai` …) |
| localStorage `respec.drafts` | `status='draft'` 행 |
| localStorage `respec.published` | `status='published'` 행 |

**연동 시 교체 지점은 `frontend/src/lib/storage.js` 하나다** — `loadDrafts/saveDraft/publishDocument/getPublishedDocument/addCommentToPublished`가 전부 여기 모여 있으므로, 같은 시그니처로 백엔드 API 호출로 바꾸면 화면 코드는 그대로 동작한다.

## 내일 할 일 (Supabase)

1. Supabase 프로젝트 생성 → URL·service key를 `backend/.env`에 (`.gitignore` 확인)
2. SQL Editor에서 [`backend/db/schema.sql`](../backend/db/schema.sql) 실행 → `documents` 테이블 생성
3. backend에 `@supabase/supabase-js` 연결, `/api/health`에 DB 상태 포함 (2주차 계획 T3)
4. `POST /api/documents` / `GET /api/documents/:id` (T4) → `storage.js`를 API 호출로 교체 (T6)
