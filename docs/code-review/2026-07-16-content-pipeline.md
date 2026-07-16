# 콘텐츠 수집 파이프라인 코드 리뷰

- 리뷰 일자: 2026-07-16
- 리뷰 대상: RSS/Atom 콘텐츠 수집 파이프라인 구현, 관련 migration과 source seed
- 기준 문서: `docs/plan/content_pipeline.md`, `docs/quality/rss-dry-run.md`, `docs/DEVELOPMENT.md`
- 결론: 머지 전 수정 필요

## 요약

파서, item 단위 RPC, 중복 처리, DB 기본값 사용과 RPC 권한 구성은 설계 방향과 일치한다. 실제 우아한형제들 기술블로그 feed도 10건을 정상 파싱했다.

다만 canonical URL을 잘못 바꿀 수 있는 query 정규화, 잘못된 item 하나가 feed 전체를 중단시키는 예외 처리, save 후 계획 집계가 사라지는 문제는 저장 결과의 정확성에 직접 영향을 준다. dry-run의 관심사 태깅 지표도 완료 기준보다 부족하다. 따라서 현재 구현은 머지 전에 아래 P1 항목을 수정하고 회귀 테스트를 추가해야 한다.

## 발견 사항

### P1. 의미 있는 query parameter가 변형된다

대상: `backend/app/content/url_normalizer.py:49`

`parse_qsl()`로 query를 decode한 뒤 문자열을 직접 이어 붙인다. 이 과정에서 값 안의 percent encoding, `+`, 빈 값과 `=` 표현이 손실된다.

재현 결과:

```text
입력: https://example.com/a?next=%2Ffoo%3Fa%3D1%26b%3D2&sig=a%2Bb%3D
출력: https://example.com/a?next=/foo?a=1&b=2&sig=a+b=

입력: https://example.com/a?x=a+b&empty=&flag
출력: https://example.com/a?x=a b&empty&flag
```

값 내부의 `%26`이 실제 parameter 구분자 `&`로 바뀌어 원문 링크가 달라지고, 서로 다른 글이 같은 canonical URL로 충돌할 수 있다. 이는 "추적 parameter만 제거하고 의미 있는 query는 보존한다"는 설계를 위반한다.

수정 기준:

- 추적 key만 제거한다.
- 나머지 query의 순서, 중복, percent encoding, `+`, 빈 값 표현을 보존한다.
- 의미 있는 query가 정규화 전후 동일한 의미를 갖는 회귀 테스트를 추가한다.

### P1. 비정상 URL item 하나가 feed 전체를 중단시킨다

대상: `backend/app/content/parser.py:51`, `backend/app/content/url_normalizer.py:36`

item 검증 전에 `normalize_url()`을 호출한다. URL의 port가 숫자가 아니면 `parts.port`에서 `ValueError`가 발생하고, 이 예외가 item reject로 변환되지 않는다.

다음 두 item을 가진 fixture로 재현했다.

```text
1. https://example.com:bad/a
2. https://example.com/good
```

첫 item에서 `ValueError: Port could not be cast to integer value as 'bad'`가 발생해 두 번째 정상 item도 처리되지 않았다.

수정 기준:

- URL parse, port, IDNA 변환 오류를 해당 item의 `INVALID_URL`로 처리한다.
- 잘못된 item을 제외한 뒤 다음 item을 계속 처리한다.
- item 오류가 CLI traceback으로 노출되지 않게 한다.

### P1. save 후 CollectionPlan 집계가 사라진다

대상: `backend/app/content/service.py:104`, `backend/app/content/models.py:165`

save 과정에서 item 상태를 `planned_new`에서 `inserted`, `duplicate_race`, `failed`로 바꾼다. 그런데 `planned_new_count`와 `missing_published_at_count`는 현재 item 상태로 동적 계산된다.

재현 결과:

```text
save 전: planned_new=1, missing_published_at=1, ratio=100%
save 후: planned_new=0, missing_published_at=0, ratio=0%
```

따라서 save 출력만 보면 원래 몇 건을 저장할 계획이었는지와 발행일 결측 상태를 알 수 없다. 설계의 `CollectionPlan`과 `SaveResult 추가 필드` 구분에도 맞지 않는다.

수정 기준:

- 계획 시점 집계와 item 목록을 보존한다.
- `inserted_count`, `duplicate_race_count`, `failed_count`, `failed_items`, `run_status`는 저장 결과로 별도 누적한다.
- dry-run과 save가 같은 입력 계획을 보고하도록 테스트한다.

### P1. dry-run 관심사 태깅 지표가 없다

대상: `backend/app/content/models.py:149`, `backend/app/jobs/collect_feed.py:32`, `backend/app/content/repository.py:21`

현재 구현은 source 관심사의 개수만 조회한다. 다음 완료 기준 필드와 출력은 구현되지 않았다.

- `interest_tag_counts`
- `untagged_count`
- `tagging_method_counts`

이 상태에서는 관심사가 한 곳에 과도하게 몰리는지, 태그가 없는 추천 불가 item이 있는지 dry-run에서 확인할 수 없다.

수정 기준:

- `source_interests`의 관심사와 가중치를 읽는다.
- `planned_new`에 복사될 예상 관심사 분포를 저장 없이 계산한다.
- MVP의 자동 태깅 방식인 `source_rule` 분포와 미태깅 item 수를 출력한다.

### P2. 5 MiB 응답 제한이 다운로드를 제한하지 못한다

대상: `backend/app/content/fetcher.py:45`

`client.get()`이 response body 전체를 메모리에 받은 뒤 `len(response.content)`를 검사한다. 따라서 큰 응답을 모두 다운로드하고 메모리에 보관한 다음에야 `FETCH_TOO_LARGE`가 발생한다.

수정 기준:

- streaming response를 사용한다.
- chunk 누적 크기가 5 MiB를 넘는 즉시 다운로드를 중단하고 `FETCH_TOO_LARGE`로 실패한다.

### P2. feed reading time의 `source_meta` 경로가 도달 불가능하다

대상: `backend/app/content/planner.py:98`

`resolve_reading_time(None, source)`를 항상 호출하고 `ArticleCandidate`에도 feed reading time 필드가 없다. 따라서 모든 글이 `sources.default_reading_time_minutes`와 `source_default`로 저장된다.

수정 기준:

- 검증된 feed 필드를 MVP에서 지원한다면 parser와 `ArticleCandidate`를 연결한다.
- 지원할 feed 필드가 아직 없다면 현재 동작을 명시하고 `source_meta` 지원을 후속 범위로 옮긴다.

이 항목은 어떤 feed 필드를 reading time의 신뢰 가능한 source metadata로 인정할지 제품·콘텐츠 측 결정이 필요하다.

## 정상으로 확인한 사항

### 실제 feed dry-run

우아한형제들 기술블로그 source로 저장 없는 dry-run을 실행했다.

```text
fetched/parsed  : 10/10
planned_new     : 0
duplicate_in_db : 10
duplicate_feed  : 0
rejected        : 0
```

실행 시점에는 10개 URL이 모두 DB에 존재해 신규 저장 예정은 0건이었고, 명령은 exit code 0으로 종료됐다.

### DB 및 RPC

실제 Supabase DB에서 다음을 확인했다.

- `sources`에 파이프라인 설정 컬럼과 check 제약이 적용돼 있다.
- `articles`의 `content_type`, `source_type`, `reading_time_source` 등 도메인 제약과 구현 값이 일치한다.
- `ingest_rss_article(uuid, jsonb)`는 `SECURITY INVOKER`다.
- 함수 `search_path`는 `public`으로 고정돼 있다.
- 함수 실행 권한은 `postgres`, `service_role`에만 있고 `anon`, `authenticated`, `PUBLIC`에는 없다.
- article insert와 source 관심사 tag insert가 한 함수 호출의 같은 transaction 안에 있다.
- canonical URL 충돌은 기존 article과 tag를 갱신하지 않고 `duplicate`를 반환한다.

## 검증 공백

Python compile과 CLI help는 정상 동작했지만, 테스트 탐색 결과는 다음과 같았다.

```text
Ran 0 tests in 0.000s
NO TESTS RAN
```

최소한 다음 자동 테스트가 필요하다.

- 의미 있는 query 보존과 추적 parameter 제거
- trailing slash를 임의로 합치지 않음
- 비정상 item URL 격리와 다음 item 처리
- feedparser `bozo=true` 전체 실패 및 저장 0건
- 응답 크기 초과의 조기 중단
- dry-run 전후 article/tag 행 수 불변
- 순차·동시 canonical URL 중복
- tag insert 실패 시 article rollback
- anon/authenticated RPC 실행 거부
- RPC 일부 실패 후 다음 item 계속 처리 및 exit code 1
- save 후 계획 집계 보존
- 관심사별 예상 태깅 분포 출력

## 머지 전 완료 기준

- [x] P1 네 건을 수정한다. (query 보존, 비정상 URL 격리[bad port + IDNA], save 집계 보존, 관심사 지표)
- [x] 각 P1 재현 사례를 자동 회귀 테스트로 고정한다. (`backend/tests/test_content_pipeline.py`)
- [x] `docs/quality/rss-dry-run.md`의 관심사 태깅 출력을 구현한다. (interest_tag_counts·untagged_count·tagging_method_counts)
- [x] 실제 source dry-run에서 정규화 전후 URL과 집계를 다시 확인한다. (우아한형제들 10/10, exit 0)
- [x] save 테스트 후 같은 feed dry-run의 신규 저장 예정이 0건인지 확인한다. (planned_new 0 / duplicate_in_db 10)
- [ ] 실패해야 정상인 RPC 원자성·중복·권한 케이스를 **자동 테스트로** 검증한다. (아래 참조)

P2 항목은 머지 전에 수정하는 것이 권장된다. feed reading time 지원 여부처럼 새 결정이 필요한 항목은 구현자가 임의로 확장하지 않고 범위를 먼저 확정한다.

## 2차 검증 반영 (2026-07-16, 구현자)

1차 지적(P1 4건 + P2-1)과 2차 지적(IDNA, 테스트 공백)을 다음과 같이 반영했다.

- **IDNA 변환 실패 격리:** `url_normalizer._normalize_host`의 fallback을 제거해 `UnicodeError`를 전파하고, `parser`가 해당 item을 `INVALID_URL`로 제외한다. 회귀 테스트 추가(`test_idna_failure_raises`, `test_idna_failure_item_isolated`).
- **실제 save 경로 테스트:** 가짜 repository를 주입해 실제 `service.run(save)`·`_save()`를 실행한다. 계획 집계 보존, 부분 실패 후 다음 item 처리·`run_status=partial_failure`, dry-run 무저장(ingest 미호출)을 검증한다.
- **5MiB 스트리밍 제한:** `httpx.MockTransport`로 초과 응답의 `FETCH_TOO_LARGE`를 검증한다(`fetch_feed`에 테스트용 `transport` 주입 파라미터 추가).
- 자동 테스트 14개 전부 통과.

### 남은 후속 (DB 통합 테스트 필요, 자동화 미완)

아래는 Python 단위 테스트로 재현 불가능하며 실제 Postgres가 필요하다. 현재는 라이브 Supabase에서 **수동 확인**했고, 자동화는 로컬 `supabase start` 기반 통합 테스트로 후속 처리한다.

- 순차·동시 canonical URL 중복 시 article 1개 (unique 제약 + on conflict)
- tag insert 실패 시 article rollback (RPC 단일 트랜잭션)
- `anon`/`authenticated` RPC 실행 거부 (EXECUTE ACL)
- dry-run 전후 실제 `articles`/`content_interest_tags` 행 수 불변
