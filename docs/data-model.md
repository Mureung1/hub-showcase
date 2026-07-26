# 데이터 모델 설계 (`docs/data-model.md`)

> Supabase(Postgres) 전환을 위한 스키마 설계. 실제 DDL은
> `supabase/migrations/20260717000000_init_schema.sql`에 있다. 이 문서는 그
> 설계 배경과 테이블 구조를 정리한 것이며, **서버 코드
> (`decisionStore.js`/`vocabularyStore.js`)를 Supabase 클라이언트 호출로
> 바꾸는 백엔드 전환은 아직 포함하지 않는다** — 별도 backlog Task로 남겨둔다.

## 배경

현재는 `server/data/*.json` 두 파일(`decisions.json`, `vocabulary.json`)에
동기 `fs`로 직접 읽고 쓰는 구조다. 사용자 계정 없이 단일 사용자를 가정하고,
`decisions`/`vocabulary` 모두 기사 정보(`url`, `title`)를 각자 텍스트로
중복 저장하며(정규화 안 됨), "완독(읽기 완료)" 이벤트를 남기는 곳이 코드
어디에도 없다(`docs/backlog.md`의 3주차 "판단 없는 이탈 처리" Task 참고).
이 구조로는 여러 사용자를 지원할 수 없고, 완독 수(Primary 지표)와
판단수행률(Secondary 지표, `docs/plan.md`) 을 분리 집계할 데이터도 없다.

다음 세 가지를 확정하고 설계를 진행했다.

1. **처음부터 Supabase Auth 연동** — `auth.users`를 참조하는 `user_id`를
   모든 개인 데이터 테이블에 포함한다.
2. **`articles` 마스터 테이블 신설** — `url`/`title` 중복 저장을 없애고
   FK로 참조한다.
3. **`article_reads`(완독 이벤트) 테이블 포함** — 3주차 "판단 없는 이탈
   처리" Task를 나중에 스키마 변경 없이 바로 구현할 수 있도록.

## 엔티티 개요

| 엔티티 | 설명 | 현재 → 설계 |
|---|---|---|
| **User** | 서비스 사용자 | 신규 — 없음 → `auth.users` |
| **Article** | 분석 대상 외신 원문 (대시보드 카드 + 리더뷰 파싱 결과) | 신규 — 하드코딩/비영속 → `articles` 테이블 |
| **Vocabulary Term** | 기사에서 자동 적재된 핵심 용어 | 전환 — ID 없음·전역 중복 방지 → 사용자별 중복 방지 |
| **Decision** | 사용자의 투자 판단 기록 (바텀시트 닫을 때 저장) | 전환 — `id=Date.now()` → `uuid` |
| **Article Read (완독)** | 판단 여부와 무관하게 기사를 끝까지 읽었다는 이벤트 | 신규 — 없음 → `article_reads` 테이블 |

## 관계

- `Article` 1:N `Vocabulary`
- `Article` 1:N `Decision`
- `Article` 1:N `ArticleRead`
- `User` 1:N `Vocabulary` / `Decision` / `ArticleRead`
- `ArticleRead` 0:1 `Decision` — 완독이 판단으로 이어졌으면 연결, 아니면 `null`
  (판단수행률 계산의 근거)

## 테이블 설계

### `articles`

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK, `default gen_random_uuid()` |
| url | text | `unique not null` |
| title | text | `not null` |
| source | text | |
| source_initial | text | |
| published_at | timestamptz | nullable (파서가 실제 발행일이 아닌 파싱 시각을 넣는 현재 한계 유지) |
| created_at | timestamptz | `default now()` |

### `vocabulary`

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK, `default gen_random_uuid()` |
| user_id | uuid | `references auth.users(id) on delete cascade, not null` |
| article_id | uuid | `references articles(id) on delete cascade, not null` |
| term | text | `not null` |
| definition | text | `not null` |
| added_at | timestamptz | `default now()` |

`unique (user_id, lower(term))` — 기존 전역 중복 방지 로직을 사용자별로
전환(멀티유저 도입에 따른 자연스러운 변경).

### `decisions`

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK, `default gen_random_uuid()` |
| user_id | uuid | `references auth.users(id) on delete cascade, not null` |
| article_id | uuid | `references articles(id) on delete cascade, not null` |
| summary_bullets | text[] | nullable |
| decision | text | `check (decision in ('buy','hold','sell')) not null` |
| market_sentiment | text | `check (market_sentiment in ('bullish','neutral','bearish'))`, nullable |
| insight | text | nullable |
| created_at | timestamptz | `default now()` |

동일 기사에 대한 재판단은 제약 없이 허용(현재 앱 동작과 동일하게 unique
제약을 걸지 않음).

### `article_reads`

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK, `default gen_random_uuid()` |
| user_id | uuid | `references auth.users(id) on delete cascade, not null` |
| article_id | uuid | `references articles(id) on delete cascade, not null` |
| completed_at | timestamptz | `default now()` |
| decision_id | uuid | `references decisions(id) on delete set null`, nullable |

Primary 지표(완독 수) = `count(*)`. Secondary 지표(판단수행률) =
`count(decision_id is not null) / count(*)`.

### 인덱스

- `vocabulary(user_id)`
- `decisions(user_id, article_id)`
- `article_reads(user_id, article_id)`

### RLS (Row Level Security)

| 테이블 | RLS | 정책 |
|---|---|---|
| `articles` | 활성화 | 전체 공개 select. insert/update는 서비스 역할(백엔드)만 |
| `vocabulary` | 활성화 | 본인 행만 select/insert/update/delete (`auth.uid() = user_id`) |
| `decisions` | 활성화 | 본인 행만 select/insert/update/delete |
| `article_reads` | 활성화 | 본인 행만 select/insert/update/delete |

## Supabase 적용

전체 스키마는 `supabase/migrations/20260717000000_init_schema.sql`에
실행 가능한 SQL로 작성되어 있다.

- Supabase 대시보드의 SQL Editor에 그대로 붙여넣어 실행하거나, `supabase`
  CLI로 `supabase db push`로 적용 가능
- 4개 테이블의 `CREATE TABLE`, `CHECK` 제약, `UNIQUE INDEX`, RLS `ENABLE` +
  `POLICY` 문을 전부 포함
- 표준 마이그레이션 파일명 규칙(`YYYYMMDDHHMMSS_설명.sql`) 준수

## 검증 방법

- Supabase 프로젝트(또는 로컬 `supabase start`)의 SQL Editor에서 실행해
  에러 없이 4개 테이블 + 인덱스 + RLS 정책이 생성되는지 확인
- `insert into articles ...` 등 샘플 레코드를 넣어 FK/CHECK 제약이
  의도대로 동작하는지(잘못된 `decision` 값 insert 시 거부되는지 등) 수동
  확인

## 스코프 밖 (설계 당시 기준, 이후 완료됨)

이 문서 작성 시점(2026-07-17)에는 아래 항목을 스코프 밖으로 두고 별도
backlog Task로 미뤘으나, 모두 완료됐다(`docs/backlog.md` 참고).

- 서버 코드를 Supabase 클라이언트 호출로 바꾸는 백엔드 전환 —
  `vocabularyStore.js`는 2026-07-17, `decisionStore.js`는 2026-07-21
  전환 완료(GitHub #12)
- Supabase 프로젝트 생성/CLI 연결 — 완료
- `server/.env`에 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` 추가 — 완료
