# RSS/Atom 콘텐츠 수집 파이프라인 설계

이 문서는 MVP의 RSS/Atom 수집 파이프라인 구현 계약을 정의한다. 콘텐츠 범위는 [`content-strategy.md`](content-strategy.md), DB 값은 [`db-schema.md`](db-schema.md), dry-run 출력은 [`../../quality/rss-dry-run.md`](../../quality/rss-dry-run.md)를 따른다.

## 1. 범위와 확정 결정

### 이번 범위

- RSS 2.0과 Atom 1.0만 수집한다.
- 사전 검수된 한국어 `primary` 소스 여러 개로 시작한다.
- DB `sources`에 등록된 소스만 실행하며 임의 feed URL은 받지 않는다.
- 제목, URL, 출처, 발행일, 저자, 공식 소개문, 썸네일 URL 등 메타데이터만 저장한다.
- 원문 전문, Atom `content`, RSS `content:encoded`, AI 요약은 저장하지 않는다.
- 관심사 태깅은 `source_interests`를 상속하는 `source_rule`만 사용한다.
- 추적 parameter만 보수적으로 제거한다.
- 기존 `canonical_url`은 article, metadata, tag를 갱신하지 않고 완전히 건너뛴다.
- article과 관심사 tag는 item 단위 RPC 한 건으로 원자적으로 저장한다.

### 이번 범위에서 제외

- 공식 API, 관리자 수동 등록 UI
- 원문/OG 메타데이터 크롤링과 원문 HEAD/GET 접근성 검사
- 본문 기반 읽기 시간
- 키워드·AI 태깅, 번역, stance/difficulty 자동 판정
- 기존 article 갱신과 깨진 링크 재검사
- 자동 scheduler와 영속 batch run 테이블

스케줄러는 수동 실행과 저장 안정성을 검증한 뒤 연결한다. 파이프라인 코어는 CLI와 이후 scheduler가 같은 진입점을 사용한다.

## 2. 전체 흐름

```text
source_id + mode(dry_run | save)
  → source/source_interests 조회와 실행 조건 검증
  → feed GET
  → feedparser로 RSS/Atom 전체 파싱
  → bozo·필수 구조 검사
  → item 필드 매핑·sanitize
  → canonical URL 정규화
  → 필수값·접근성·추천 가능성 검증
  → feed 내부 중복 제거
  → DB 기존 URL 조회
  → 안정적인 CollectionPlan 생성
  → dry_run: 계획만 출력
  → save: 신규 item마다 ingest_rss_article RPC
  → 실행 요약과 exit code
```

- source 조회, fetch, feed parse 중 하나라도 실패하면 해당 실행은 저장을 시작하지 않는다.
- item 변환 실패는 `rejected`, 기존 URL은 `duplicate`, RPC 실패는 `failed`로 구분한다.
- item RPC 하나가 실패해도 다음 item은 처리한다.
- dry-run과 save는 저장 단계 전까지 완전히 같은 코드를 사용한다.
- source 하나가 한 실행의 fetch·parse·저장 격리 단위다. 여러 source는 같은 명령에서 병렬 처리하지 않고 source별 명령을 순차 실행한다.

## 3. 실행 인터페이스

```bash
cd backend
uv run python -m app.jobs.collect_feed --source-id <uuid> --dry-run
uv run python -m app.jobs.collect_feed --source-id <uuid> --save
```

- 기본 mode는 `--dry-run`이다.
- 두 mode를 동시에 지정할 수 없다.
- MVP는 한 번에 source 1개만 실행한다. 여러 source 등록과 수집을 지원하되, 각 source를 먼저 독립적으로 검증하고 순차 실행하여 실패 범위와 로그를 source 단위로 고정한다.
- `--all`, 병렬 실행, scheduler orchestration은 MVP 이후다. 운영자가 실행할 source 순서는 별도로 정하며, 같은 canonical URL을 여러 source가 제공하면 먼저 저장된 source가 소유하고 이후 실행은 기존 URL로 완전히 건너뛴다.

| exit code | 상태 | 조건 |
| ---: | --- | --- |
| `0` | `success` | feed 성공, RPC 실패 0. duplicate와 일부 rejected는 허용 |
| `1` | `partial_failure` | parse 성공 후 item RPC가 1건 이상 실패 |
| `2` | `failure` | source/fetch/parse 실패, feed item 0건, 또는 모든 item rejected |

모든 item이 기존 URL이라 `inserted=0`, `duplicate>0`인 실행은 정상이다.

## 4. Source 계약

실행 시작 시 `sources`와 `source_interests`를 한 번 읽어 변경 불가능한 `SourceConfig`를 만든다.

### 실행 조건

```text
source.id = requested source_id
active = true
collection_method = 'rss'
language = 'ko'
default_exposure = 'primary'
trust_level in ('high', 'medium')
paywall_risk = 'low'
feed_url is not null
source_interests count >= 1
```

하나라도 만족하지 않으면 fetch 전에 `failure`로 끝낸다. Atom도 DB의 `collection_method`는 `rss`를 사용하고 parser가 포맷을 감지한다.

### sources 수집 설정 컬럼

코드의 `SourceProfile` registry는 두지 않는다. 아래 컬럼을 `sources`에 추가하고, 실행 시 source 행과 관심사를 함께 읽어 변경 불가능한 런타임 `SourceConfig`를 만든다.

| 컬럼 | 제약 | 용도 |
| --- | --- | --- |
| `content_type` | text, not null, check `article/blog/video` | `articles.content_type`과 같은 도메인 |
| `excerpt_field` | text, not null, check `summary/description/none` | 저장을 허용한 feed 공식 소개문 필드 |
| `default_reading_time_minutes` | integer, not null, check `1..60` | feed에 유효한 읽기 시간이 없을 때의 source 기본값 |
| `feed_timezone` | text, nullable, 현재 `Asia/Seoul`만 허용 | timezone 정보가 없는 RSS 날짜의 source별 fallback |

- `source_type`은 기존 `sources.source_type`에서 가져온다.
- 새 source 등록은 코드 수정·배포가 아니라 `sources`, `source_interests` 행 등록과 fixture 검수로 끝난다.
- 2026-07-15 확인 기준 원격 `sources`는 0행이므로 첫 마이그레이션에서 위 컬럼을 곧바로 `NOT NULL`로 추가할 수 있다. 적용 직전에 행 수를 다시 확인하고, 행이 생겼다면 `nullable 추가 → source별 명시적 backfill → NOT NULL/check` 순서로 바꾼다.
- `timezone` 컬럼은 MVP에 추가하지 않는다. feedparser가 해석하지 못하거나 timezone이 없는 날짜는 `published_at=null`로 처리하며, 실제 source 검증에서 반복 문제가 확인될 때 IANA timezone 컬럼을 추가한다.
- 위 필수 컬럼이 null이거나 DB 제약 밖 값이면 fetch 전에 `SOURCE_NOT_ELIGIBLE`로 실패한다.

## 5. Fetch 계약

- HTTP GET만 사용하고 `http`, `https` scheme만 허용한다.
- 명시적인 User-Agent를 보낸다.
- connect timeout 5초, read timeout 15초를 기본값으로 한다.
- redirect는 최대 3회이며 최종 host가 최초 feed host와 다르면 실패한다.
- 최대 응답 크기는 5 MiB다.
- timeout, 연결 실패, `429`, `5xx`만 1초·3초 backoff로 최대 2회 재시도한다.
- 그 외 `4xx`와 malformed XML은 재시도하지 않는다.

ETag/Last-Modified와 `304` 최적화는 실행 상태를 저장할 위치가 없으므로 후속으로 미룬다.

## 6. Parse와 필드 매핑

HTTP 응답 bytes를 `feedparser.parse(bytes)`에 전달해 `FeedItem` 목록으로 변환한다. feedparser가 URL을 직접 fetch하게 하지 않아 5장의 timeout, redirect, 크기 제한을 우회하지 않게 한다.

feedparser는 손상된 XML도 최대한 읽으려는 관대한 parser이므로 다음 중 하나면 `FEED_PARSE_ERROR`로 해당 source 저장 0건 후 실패한다.

- `parsed.bozo`가 true다. `bozo_exception`의 class와 잘린 message만 로그에 남기고, 복구된 entry가 있어도 사용하지 않는다.
- `parsed.version`이 지원 범위인 RSS 2.0 또는 Atom 1.0이 아니다.
- feed 필수 구조가 없거나 entry 목록으로 해석할 수 없다.

정상 구조지만 entry가 0개면 `FEED_EMPTY`다. 첫 MVP는 feed가 제공한 순서의 앞 50개 item만 처리한다.

의존성은 backend 프로젝트에 `feedparser`를 직접 선언하고 lockfile로 고정한다.

| ArticleCandidate | RSS/Atom 입력 | 규칙 |
| --- | --- | --- |
| `title` | `title` | plain text, 필수 |
| `original_url` | alternate `link` | http/https, 필수 |
| `published_at` | feedparser `published_parsed` → `updated_parsed` | UTC 변환, 실패 시 null |
| `author` | feedparser `author` | `dc:creator`가 매핑된 값 포함, 없으면 null |
| `official_excerpt` | source의 `excerpt_field`가 가리키는 feedparser `summary` 또는 `description` | `none`이면 null, 허용 필드만 사용 |
| `thumbnail_url` | feedparser `media_thumbnail` → image `media_content` → image `enclosures` | URL만 저장 |
| `content_type` | `sources.content_type` | DB enum만 허용 |
| `source_type` | `sources.source_type` | item 값으로 덮어쓰지 않음 |

RSS `content:encoded`와 Atom `content`는 원문 전문일 수 있으므로 fallback으로도 사용하지 않는다.

### 문자열 정리

1. script/style 제거
2. HTML tag 제거
3. HTML entity decode
4. Unicode NFC
5. 줄바꿈·연속 공백을 공백 하나로 축소
6. trim

길이 제한은 title 300자, author 200자, excerpt 1,000자다. 빈 title은 `MISSING_TITLE`, 빈 excerpt는 null이다. 프론트는 excerpt를 HTML로 렌더링하지 않는다.

### 발행일

- feedparser의 `published_parsed`, 없으면 `updated_parsed`를 UTC로 변환한다.
- 구조화 날짜가 없고 source에 `feed_timezone`이 설정돼 있으면 RSS 원문 `published`, 없으면 `updated`를 해당 timezone으로 해석한 뒤 UTC로 변환한다.
- 현재 fallback은 timezone 없는 날짜를 제공하는 DEVOCEAN의 `Asia/Seoul`에만 사용한다. source에 `feed_timezone`이 없거나 원문도 해석할 수 없으면 null이다.
- 현재 시각보다 24시간 이상 미래면 `FUTURE_PUBLISHED_AT`으로 제외한다.
- null은 저장하되 dry-run에서 비율을 출력한다.

## 7. Canonical URL 정규화

원문을 요청하거나 HTML canonical tag를 읽지 않는다.

적용 순서:

1. URL parse
2. scheme/host 소문자화
3. IDN host ASCII 정규화
4. 기본 포트 제거
5. fragment 제거
6. 추적 parameter 제거
7. 남은 query의 순서·중복 보존
8. 빈 query marker 제거

path의 trailing slash, 대소문자, percent encoding은 바꾸지 않는다.

대소문자 구분 없이 제거하는 key:

```text
utm_*
fbclid
gclid
dclid
msclkid
mc_cid
mc_eid
_ga
```

목록 밖 parameter는 빈 값이어도 보존한다.

```text
https://EXAMPLE.com:443/a?id=10&utm_source=rss#top
→ https://example.com/a?id=10

https://example.com/a?id=10
https://example.com/a?id=11
→ 서로 다른 글

https://example.com/a
https://example.com/a/
→ 서로 다른 URL
```

원래 URL은 `metadata.ingestion.original_url`에 저장한다.

## 8. 접근성 판정

원문 요청 없이 title, URL, excerpt와 `sources.paywall_risk`만 사용한다.

유료 신호:

```text
premium, paid, members, membership, subscribe,
유료, 구독, 멤버십, 회원전용
```

| 조건 | access_type | 처리 |
| --- | --- | --- |
| 유료 신호 있음 | `paywalled` | `PAYWALL_SIGNAL`로 저장 제외 |
| 신호 없음 + paywall_risk=low | `free` | 다음 단계 |
| 그 외 | `unknown` | `ACCESS_UNKNOWN`으로 저장 제외 |

`partial_free`는 자동 판정하지 않는다. `url_status`는 feed에 유효한 link가 있다는 뜻으로 `active`를 저장하되 원문 확인은 하지 않았으므로 `last_checked_at=null`이다.

## 9. 읽기 시간과 품질 점수

- fixture에서 검증된 feed 필드가 1~60분의 양의 정수를 제공하면 그 값과 `source_meta`를 사용한다.
- 아니면 `sources.default_reading_time_minutes`와 `source_default`를 사용한다.
- 본문 길이는 읽지 않는다.

> **MVP 결정 (2026-07-16):** 현재 검증한 RSS feed에는 읽기 시간 필드가 없어 `source_meta` 경로는 실제로 쓰이지 않고, 모든 글이 `source_default`로 저장된다. `source_meta` 연결은 읽기 시간을 제공하는 소스가 생길 때 후속 범위로 다룬다. 저장은 유지하되 카드 노출 여부는 프론트에서 별도로 결정한다.

품질 점수:

```text
metadata_bonus =
  excerpt, published_at, author 중 2개 이상 있으면 0.05
  아니면 0.00

quality_score = clamp(
  sources.source_quality_score
  + 0.10  # free access
  + metadata_bonus,
  0.00,
  1.00
)
```

low trust, inactive, non-primary, non-free는 점수 감점이 아니라 앞 단계에서 제외한다. 최종 점수가 0.65 미만이면 `QUALITY_BELOW_THRESHOLD`로 제외한다.

`published_at=null`은 수집·저장을 막지 않고 위 quality score 공식도 바꾸지 않는다. 다만 현재 `get_recommended_articles`의 `recency_score`가 최하값 `0.1`이 되어 사실상 오늘의 글로 노출되지 않는다. dry-run은 source별 `missing_published_at_count`와 parsed item 대비 비율을 계속 출력한다.

## 10. 관심사 태깅

RPC가 source의 `source_interests`를 직접 읽어 신규 article에 복사한다.

```text
content_id = new article id
interest_id = source_interests.interest_id
confidence = source_interests.weight
tagging_method = 'source_rule'
```

Python은 tag 목록을 보내지 않는다. 관심사 0개 source는 fetch 전에 실패한다.

## 11. 중복과 안정적인 계획

- feed 내부 canonical URL이 같으면 feed 순서상 첫 item만 남긴다.
- 뒤 item은 `DUPLICATE_IN_FEED`로 기록하고 원본 URL을 출력한다.
- canonical URL 목록을 한 번에 DB에서 조회한다.
- 기존 URL은 `DUPLICATE_IN_DB`이며 article과 tag를 수정하지 않는다.
- 신규 item은 canonical URL 오름차순으로 정렬해 출력·저장 순서를 안정화한다.
- 조회 후 동시 실행 race는 RPC의 unique 처리로 해결한다.
- 서로 다른 source가 같은 canonical URL을 제공해도 `articles.canonical_url` 전역 unique와 "기존 URL 완전 skip" 규칙을 그대로 적용한다. 먼저 저장된 article의 source와 tag가 유지되며 뒤 source는 덮어쓰거나 tag를 합치지 않는다.
- 따라서 여러 source의 최초 저장 실행 순서는 사람이 먼저 정하고 실행 기록에 남겨야 한다. 자동 우선순위 컬럼과 batch winner 계산은 MVP에 추가하지 않는다.

기존 article 중 tag 0개인 orphan은 실행 전 audit하고 수동 정리한다. duplicate 경로에서 자동 복구하지 않는다.

## 12. Item 단위 RPC

```text
ingest_rss_article(
  p_source_id uuid,
  p_article jsonb
)
→ { status: 'inserted' | 'duplicate', article_id: uuid }
```

허용 key:

```text
title, canonical_url, published_at, author, official_excerpt,
thumbnail_url, reading_time_minutes,
reading_time_source, quality_score, original_url
```

알 수 없는 key는 거부한다.

### RPC 책임

한 호출이 한 Postgres transaction이다.

1. source의 active/rss/ko/primary/trust/paywall 조건 재검증
2. `source_interests` 1개 이상 확인
3. URL scheme, 문자열 길이, enum, 읽기 시간, 점수 범위 재검증
4. `content_type`, `source_type`은 source에서 가져온다.
5. `canonical_url` unique insert
6. 기존 URL이면 아무것도 갱신하지 않고 `duplicate`
7. 신규면 source 관심사를 `content_interest_tags`로 insert
8. tag 하나라도 실패하면 article까지 rollback
9. 성공하면 `inserted`와 article id 반환

동일 URL 동시 호출에서도 하나만 inserted이고 나머지는 duplicate여야 한다.

현재 `articles` check 제약 기준으로 default가 없는 필수 insert 값은 `title`, `canonical_url`, `content_type`, `source_type` 네 개다. RPC는 앞의 두 값은 검증된 article 입력에서, 뒤의 두 값은 검증된 source 행에서 채운다. `published_at`, `author` 등 nullable enrichment는 값이 있을 때만 넣고, `quality_score`, 읽기 시간처럼 파이프라인이 계산한 값은 명시적으로 넣는다. `difficulty_level`, `stance`, `language`, `access_type`, `thumbnail_status`, `url_status`, `created_at`은 RPC 입력으로 열지 않고 DB 기본값을 사용한다. 접근성 단계에서 free 후보만 RPC에 도달하므로 `access_type` 기본값 `free`와 일치한다. raw `metadata` 입력도 받지 않고, 검증한 `original_url`로 RPC가 `metadata.ingestion.original_url`만 구성한다.

### RPC 권한

- `SECURITY INVOKER`를 기본으로 하고 backend secret key의 privileged role로 실행한다.
- `PUBLIC`, `anon`, `authenticated`의 EXECUTE를 명시적으로 revoke한다.
- backend privileged role에만 EXECUTE를 grant한다.
- 고정 search_path와 schema-qualified table 이름을 사용한다.
- 브라우저와 사용자 JWT 요청은 호출하지 않는다.
- 구현 후 함수 owner/ACL, 실제 secret key 역할을 조회하고 Supabase security advisor를 실행한다.

## 13. DB 마이그레이션 워크플로우

이 파이프라인부터 DB 변경 파일을 `supabase/migrations/`에 두고 git으로 관리한다. Dashboard SQL Editor나 원격 MCP로 먼저 스키마를 바꾸지 않는다.

### 최초 1회: 기존 원격 이력 정합화 완료

2026-07-15에 원격 migration 이력 10건의 원본 SQL을 version/name 그대로 `supabase/migrations/`에 복원했다. fresh local DB는 이 이력부터 재생하며, 현재 schema를 별도 baseline으로 중복 생성하지 않는다.

새 migration은 파일명 timestamp를 직접 만들지 않고 CLI가 생성하게 한다.

```bash
supabase migration new add_rss_source_config
supabase migration new create_ingest_rss_article
supabase migration new add_source_feed_timezone
```

파이프라인 migration은 CLI로 생성해 git으로 관리한다.

1. [`20260715090747_add_rss_source_config.sql`](../../../supabase/migrations/20260715090747_add_rss_source_config.sql)은 `sources.content_type`, `excerpt_field`, `default_reading_time_minutes`와 이 문서의 check/not-null 제약을 추가한다.
2. [`20260715090748_create_ingest_rss_article.sql`](../../../supabase/migrations/20260715090748_create_ingest_rss_article.sql)은 exact signature의 RPC, 입력 검증, item transaction, EXECUTE revoke/grant를 생성한다.
3. [`20260724043752_add_source_feed_timezone.sql`](../../../supabase/migrations/20260724043752_add_source_feed_timezone.sql)은 timezone 없는 RSS 날짜를 위한 nullable `sources.feed_timezone`을 추가한다.
4. RPC migration은 source 수집 설정 migration 뒤에 적용되어야 하고, `feed_timezone` fallback은 세 번째 migration 적용 후에만 사용한다.

### 로컬 검증과 원격 적용

```bash
supabase start
supabase db reset
supabase migration list
supabase db push --dry-run
supabase db push
```

- `db reset`으로 빈 local DB에 baseline부터 현재 migration까지 전부 재생되는지 확인한다.
- local에서 source eligible/invalid, inserted/duplicate, tag rollback, concurrent duplicate, anon/authenticated EXECUTE 거부를 검증한다.
- linked remote의 `migration list`와 `db push --dry-run` 결과를 사람이 검토한 뒤 한 명만 `db push`한다.
- 원격 적용 후 sources 컬럼/check, 함수 signature·owner·ACL·`SECURITY INVOKER`, 실제 backend secret key 역할을 조회하고 security/performance advisor를 실행한다.
- `replace_user_interests` RPC는 이 문서 범위가 아니다. 관심사 API 구현 때 같은 migration 워크플로우로 별도 생성한다.

## 14. Dry-run과 Save

공통 데이터 흐름:

```text
FetchResult
→ ParsedFeed
→ list[ArticleCandidate]
→ list[PlannedItem]
→ CollectionPlan
```

- `DryRunExecutor`: DB write와 RPC를 호출하지 않는다.
- `SaveExecutor`: `planned_new`만 RPC로 저장한다.
- dry-run도 DB existing URL 조회는 한다.
- dry-run 전후 `articles`, `content_interest_tags` 행 수가 모두 같아야 한다.

CollectionPlan:

```text
source_id, feed_url, mode,
fetched_count, parsed_count, planned_new_count,
duplicate_in_feed_count, duplicate_in_db_count,
rejected_count, rejected_by_reason,
missing_published_at_count, missing_published_at_ratio,
interest_tag_counts, untagged_count, tagging_method_counts,
items
```

SaveResult 추가 필드:

```text
inserted_count, duplicate_race_count,
failed_count, failed_items, run_status
```

로그에는 secret, feed 응답 전문, excerpt 전문을 남기지 않는다. title, 원래/정규화 URL, 상태, 사유만 출력한다.

## 15. 처리 상태와 오류

Item 상태:

```text
planned_new
inserted
duplicate_in_feed
duplicate_in_db
duplicate_race
rejected
failed
```

Item 제외 사유:

```text
MISSING_TITLE
MISSING_URL
INVALID_URL
UNSUPPORTED_URL_SCHEME
FUTURE_PUBLISHED_AT
PAYWALL_SIGNAL
ACCESS_UNKNOWN
QUALITY_BELOW_THRESHOLD
DUPLICATE_IN_FEED
DUPLICATE_IN_DB
```

Feed/source 오류:

```text
SOURCE_NOT_FOUND
SOURCE_NOT_ELIGIBLE
SOURCE_INTERESTS_EMPTY
FETCH_TIMEOUT
FETCH_HTTP_ERROR
FETCH_TOO_LARGE
REDIRECT_HOST_CHANGED
FEED_PARSE_ERROR
FEED_EMPTY
ALL_ITEMS_REJECTED
```

`SOURCE_NOT_ELIGIBLE`에는 필수 sources 수집 설정 컬럼의 null·check 범위 밖 값이 포함된다. feedparser의 `bozo=true`와 지원하지 않는/판정 불가능한 feed 구조는 `FEED_PARSE_ERROR`다.

## 16. 코드 구조

```text
backend/app/content/
  models.py
  fetcher.py
  parser.py
  sanitizer.py
  url_normalizer.py
  access.py
  scoring.py
  planner.py
  repository.py
  service.py

backend/app/jobs/
  collect_feed.py

supabase/migrations/
  <cli-generated>_add_rss_source_config.sql
  <cli-generated>_create_ingest_rss_article.sql
```

하드코딩 profile 파일은 없다. `repository.py`가 source 행을 읽고 `models.py`의 런타임 `SourceConfig`로 변환한다. parser와 변환 로직은 Supabase client를 모르며 DB 접근은 repository에만 둔다.

## 17. 부분 실패 계약

| 실패 지점 | 저장 | 처리 | 최종 상태 |
| --- | --- | --- | --- |
| source 검증 | 0건 | 중단 | failure |
| fetch/parse | 0건 | 중단 | failure |
| item 검증/access/quality | 해당 item 0건 | 다음 item | success 가능 |
| item RPC | 해당 item rollback | 다음 item | partial_failure |
| DB duplicate | 0건 | 다음 item | success |
| 전 item rejected | 0건 | 종료 | failure |

parse 완료 전에는 저장하지 않는다.

## 18. 완료 기준

### 정상 경로

- [ ] 시작할 모든 한국어 primary source가 각자의 RSS/Atom fixture와 실제 feed에서 독립적으로 파싱된다.
- [ ] source별 `--dry-run` 후 같은 순서로 source별 `--save`를 실행할 수 있다.
- [ ] 최소 1개 item이 article 1개와 tag 1개 이상으로 저장된다.
- [ ] 저장 article은 free, active, quality score 0.65 이상이며 추천 후보가 된다.
- [ ] 동일 DB 상태의 dry-run 두 번 결과가 동일하다.
- [ ] 실제 저장 후 같은 feed dry-run의 planned new가 0이다.
- [ ] 정규화 전후 URL과 모든 제외/실패 사유가 출력된다.
- [ ] dry-run에 발행일 결측 건수·비율, 관심사별 태깅 건수, 미태깅 건수, tagging method 분포가 출력된다.

### 실패해야 정상

- [ ] 부적격/필수 수집 설정 null/관심사 0개 source는 fetch 전에 `SOURCE_NOT_ELIGIBLE` 또는 `SOURCE_INTERESTS_EMPTY`로 실패한다.
- [ ] feedparser가 entry를 일부 복구해도 `bozo=true`이면 0건 저장 후 `FEED_PARSE_ERROR`로 실패한다.
- [ ] malformed XML, 필수 feed 구조 부재, timeout, 최종 HTTP 실패, 크기 초과, 다른 host redirect는 0건 저장 후 실패한다.
- [ ] title/link 결측, non-http URL, 미래 발행일은 저장되지 않는다.
- [ ] `content:encoded`와 Atom `content`는 excerpt에 들어가지 않는다.
- [ ] excerpt는 HTML/script/style 없이 plain text로 저장된다.
- [ ] 추적 parameter는 제거되지만 의미 있는 query는 보존된다.
- [ ] trailing slash만 다른 URL을 임의로 합치지 않는다.
- [ ] paywalled/unknown/partial_free는 자동 추천 후보가 되지 않는다.
- [ ] tag insert 실패 시 article도 rollback된다.
- [ ] 같은 URL 순차·동시 저장에서 article은 1개만 생긴다.
- [ ] 서로 다른 source가 같은 URL을 제공해도 먼저 저장된 article과 tag는 갱신되지 않는다.
- [ ] anon/authenticated는 RPC를 실행할 수 없다.
- [ ] dry-run 전후 articles와 tags 행 수가 같다.
- [ ] RPC 일부 실패 시 다른 item은 저장되지만 exit code는 1이다.
- [ ] `published_at=null` item은 저장 가능하고 dry-run null 건수·비율에 포함되며, 추천 함수의 recency score는 `0.1`이다.
- [ ] fresh local DB에서 기존 schema migration과 세 pipeline migration이 순서대로 재생된다.
- [ ] 원격 dry-run 적용 결과를 확인하기 전에는 `db push`하지 않는다.

## 19. source 등록 체크리스트

시작할 모든 source에 아래 항목을 source별로 적용한다.

- [ ] 공식 RSS/Atom URL이다.
- [ ] 한국어 콘텐츠가 기본이다.
- [ ] primary/active/rss/low-paywall-risk다.
- [ ] trust level과 source quality score가 정해졌다.
- [ ] source type과 perspective type이 DB enum에 맞다.
- [ ] source interests가 1개 이상이다.
- [ ] title/link/published/author 필드를 fixture로 확인했다.
- [ ] `sources.content_type`이 `article/blog/video` 중 실제 콘텐츠와 맞는 값이다.
- [ ] `sources.excerpt_field`가 `summary/description/none` 중 하나이며, 선택한 필드가 원문 전문이 아니라 저장 가능한 공식 소개문인지 확인했다.
- [ ] `sources.default_reading_time_minutes`가 `1..60`이고 source 특성에 맞다.
- [ ] timezone 없는 RSS 날짜를 제공하는 source만 `sources.feed_timezone`을 설정하고 fixture로 UTC 변환 결과를 확인했다.
- [ ] feedparser fixture에서 `bozo=false`, 지원 version, media/published/author fallback을 확인했다.
- [ ] `published_at=null` 비율과 오늘의 글 노출 저하를 수용할 수 있다.
- [ ] fixture는 실제 feed 전문 대신 최소 재현 데이터만 포함한다.

## 20. 첫 실행 순서

1. 시작할 source와 source별 수집 설정·관심사·실행 순서를 확정한다.
2. 각 source를 `--source-id ... --dry-run`으로 개별 검증한다.
3. 같은 순서로 각 source를 `--save`하고 즉시 같은 source를 다시 dry-run해 `planned_new=0`을 확인한다.
4. 전체 source가 통과한 뒤에만 수동 운영 절차에 묶는다.

## 21. 여전히 사람이 결정해야 하는 항목

### 시작 source와 최초 실행 순서

실제 source 이름, feed URL, interests, 세 수집 설정 값은 feed fixture를 보고 사람이 정해야 한다. 여러 source가 같은 canonical URL을 제공하면 기존 URL 완전 skip 규칙 때문에 최초 저장 순서가 소유 source와 tag를 결정한다.

- **MVP 권고:** 검수된 source별 순서를 명시하고 한 번에 하나씩 순차 실행한다. 구현이 단순하고 실패가 격리되지만, 먼저 실행한 source가 중복 글의 소유자가 된다.
- **후속 선택지:** `sources.collection_priority`와 multi-source runner를 추가한다. 자동 실행 순서는 명확해지지만 새 도메인 값, batch 부분 실패, 동시성 계약이 필요해 MVP 범위를 늘린다.

## 22. 후속 단계

1. scheduler와 중복 실행 잠금
2. 영속 run 이력과 알림
3. 깨진 링크/유료화 재검사
4. 수동 등록
5. 공식 API
6. 제한적 OG 메타데이터 보강
