# RSS 수집 dry-run 기준

수집기는 **DB에 쓰기 전에 반드시 dry-run으로 확인한다.** 잘못 돌면 쓰레기 데이터가 쌓이고 되돌리기 어렵다.

dry-run은 "이렇게 들어갈 것이다"만 출력하고 **INSERT를 하지 않는다.**

## 실행

```bash
uv run scripts/rss_dry_run.py            # 미구현
```

## 스키마 제약 (수집기가 반드시 맞춰야 함)

`articles`에서 **NOT NULL이고 기본값이 없는** 컬럼 — 하나라도 비면 INSERT가 실패한다.

| 컬럼 | 제약 |
| --- | --- |
| `title` | 필수 |
| `canonical_url` | 필수, **UNIQUE** |
| `content_type` | `article`, `blog`, `video` 중 하나 |
| `source_type` | `news`, `official_blog`, `expert_article` 중 하나 |

`source_id`, `published_at`, `author`, `official_excerpt`는 nullable이다.

`content_interest_tags.tagging_method`는 `source_rule`, `keyword_rule`, `admin`, `ai_assist` 중 하나여야 한다.

## 기대 결과

### 1. 파싱

- 대상 피드 수 / 파싱 성공 수 / 실패 수 출력
- **실패한 피드의 URL과 실패 사유를 개별로 출력한다.** "3개 실패"만 찍으면 디버깅이 안 된다

### 2. 필수 필드

- `title`이 없는 항목 수
- `canonical_url`이 없는 항목 수
- `published_at`이 없는 항목 수 (nullable이지만 정렬에 쓰므로 비율을 알아야 한다)

**기대** — `title`, `canonical_url` 결측은 **0건**이어야 한다. 하나라도 있으면 그 항목은 저장할 수 없다.

### 3. 중복 판정

**`articles.canonical_url`이 UNIQUE다. 중복 판정 기준은 이미 DB에 정해져 있다.**

- 이번 수집분 내부의 `canonical_url` 중복 수
- 이미 DB에 존재하는 `canonical_url` 수 (= 이번에 건너뛸 항목)
- 신규 저장 예정 수

**기대** — 같은 피드를 두 번 연속 dry-run하면, **두 번째는 신규 저장 예정이 0건**이어야 한다.

**실패 신호** — 두 번째에도 신규가 잡히면 URL 정규화가 안 되고 있다. 쿼리스트링(`?utm_source=...`)이나 트레일링 슬래시 차이로 같은 글이 다른 URL로 보인다. **정규화 규칙을 정해야 한다.**

### 4. 관심사 태깅

- 관심사별 태깅 건수 분포
- 태깅되지 않은 항목 수
- `tagging_method` 분포

**기대**

- 태깅 0건인 항목이 있으면 그 글은 **아무 사용자에게도 노출되지 않는다.** 비율을 반드시 확인한다
- 한 관심사에 90% 이상 몰리면 태깅 규칙이 잘못됐다

### 5. 저장 안 함 확인

**dry-run 실행 전후로 `articles` 행 수가 같아야 한다.**

```sql
select count(*) from articles;
```

**실패 신호** — 행이 늘었으면 dry-run이 아니다. 그 자체로 결함이다.

## 출력 형식

꾸미지 않는다. 숫자와 실패 항목 목록이면 충분하다.

```
피드 12개 중 11개 파싱 성공, 1개 실패
  실패: https://example.com/feed  (HTTP 404)

수집 항목 143건
  title 결측: 0
  canonical_url 결측: 0
  published_at 결측: 7 (4.9%)

중복 판정
  이번 수집분 내부 중복: 3
  DB에 이미 존재: 128
  신규 저장 예정: 12

관심사 태깅
  AI: 5, IT·개발: 4, 커리어·취업: 2
  태깅 없음: 1  ← 이 글은 노출되지 않는다

articles 행 수: 128 → 128 (변화 없음)
```
