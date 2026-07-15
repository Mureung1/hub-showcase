# RSS/Atom 초기 소스 선정과 실제 feed 검증

작성일: 2026-07-15

이 문서는 [`content_pipeline.md`](../plan/content_pipeline.md)의 초기 source 후보와 실제 feedparser 검증 결과를 기록한다. 아직 source DB seed나 migration을 확정하는 문서가 아니다.

## 1. 선정한 후보

초기 후보는 총 8개다.

| 이름 | 역할 | source_type | content_type | perspective_type | feed URL |
| --- | --- | --- | --- | --- | --- |
| 전자신문 | AI·IT 최신 뉴스 | `news` | `article` | `media_view` | `https://rss.etnews.com/Section901.xml` |
| 벤처스퀘어 뉴스 | 스타트업·창업 뉴스 | `news` | `article` | `media_view` | `https://www.venturesquare.net/rss/news` |
| 브런치스토리 검수 채널 | 실무자·전문가 관점 | `expert_article` | `blog` | `practitioner_view` | 미정 — 작가 또는 매거진 단위로 선택 |
| 우아한형제들 기술블로그 | 개발·제품 실무 사례 | `official_blog` | `blog` | `vendor_view` | `https://techblog.woowahan.com/feed/` |
| NAVER D2 | 개발·AI 기술 사례 | `official_blog` | `blog` | `vendor_view` | `https://d2.naver.com/d2.atom` |
| Toss Tech | 개발·제품·디자인 사례 | `official_blog` | `blog` | `vendor_view` | `https://toss.tech/rss.xml` |
| DEVOCEAN | 개발자 실무·기술 기고 | `expert_article` | `blog` | `practitioner_view` | `https://devocean.sk.com/blog/rss.do` |
| 요즘IT 컬럼 | 개발·제품·커리어 전문 글 | `expert_article` | `article` | `practitioner_view` | `https://yozm.wishket.com/magazine/feed/` |

DEVOCEAN은 SK가 운영하지만 외부 개발자의 기고와 커뮤니티 성격이 섞여 있으므로 `official_blog/vendor_view`보다 `expert_article/practitioner_view`로 분류한다.

브런치스토리는 플랫폼 전체를 하나의 source로 등록하지 않는다. 무료 공개, 주제 일관성, 저자 투명성을 검수한 작가 또는 매거진을 별도 source로 등록한다.

## 2. 검증 방법

`content_pipeline.md`와 같은 경계로 확인했다.

```text
HTTP client가 feed bytes 수신
→ feedparser.parse(response_bytes)
→ version, bozo, entries 검사
→ 최근 최대 20개 entry의 summary/date/author/content 필드 확인
```

feedparser가 URL을 직접 fetch하게 하는 방식은 최종 판정에 사용하지 않는다. 실제 파이프라인은 자체 fetcher가 timeout, redirect, 응답 크기를 통제한 뒤 bytes만 parser에 넘기기 때문이다.

## 3. 파싱 결과

브런치스토리를 제외한 7개 feed를 실제로 조회했다.

| source | status | version | bozo | entries | 발행일 | 저자 | 판정 |
| --- | ---: | --- | --- | ---: | --- | --- | --- |
| 전자신문 | 200 | `rss20` | false | 30 | 최근 20개 모두 `published_parsed` | 최근 20개 모두 있음 | 사용 가능 |
| 벤처스퀘어 뉴스 | 301→200 | `rss20` | false | 30 | 최근 20개 모두 `published_parsed` | 최근 20개 모두 있음 | 사용 가능 |
| 우아한형제들 기술블로그 | 200 | `rss20` | false | 10 | 10개 모두 `published_parsed` | 10개 모두 있음 | 사용 가능 |
| NAVER D2 | 200 | `atom10` | false | 20 | `published` 없음, 20개 모두 `updated_parsed` fallback 가능 | 없음 | 사용 가능 |
| Toss Tech | 200 | `rss20` | false | 20 | 최근 20개 모두 `published_parsed` | 없음 | 사용 가능 |
| DEVOCEAN | 200 | `rss20` | false | 6 | timezone 없는 문자열이라 `published_parsed=null` | 6개 모두 있음 | timezone 결정 필요 |
| 요즘IT 컬럼 | 200 | `rss20` | false | 30 | item 날짜 필드 자체가 없음 | 없음 | 추천 노출 정책 결정 필요 |

모든 feed에서 `media:thumbnail`, `media:content`, image enclosure는 확인되지 않았다. 초기 카드에서는 source/content type 기반 placeholder가 기본이 된다.

## 4. 발췌문 필드

검증한 7개 feed는 모두 feedparser의 `summary`로 소개문을 읽을 수 있었다. RSS `description`은 feedparser에서 `summary`로 정규화되므로 초기값은 아래처럼 둔다.

| source | excerpt_field | 최근 표본의 summary 중앙 길이 | 비고 |
| --- | --- | ---: | --- |
| 전자신문 | `summary` | 약 250자 | 기사 소개문 |
| 벤처스퀘어 뉴스 | `summary` | 약 366자 | 별도 `content`는 저장하지 않음 |
| 우아한형제들 기술블로그 | `summary` | 약 449자 | 별도 `content`는 저장하지 않음 |
| NAVER D2 | `summary` | 약 1,220자 | 저장 시 1,000자 제한 적용, `content`는 저장하지 않음 |
| Toss Tech | `summary` | 약 54자 | 짧은 공식 소개문 |
| DEVOCEAN | `summary` | 약 123자 | 공식 feed 소개문 |
| 요즘IT 컬럼 | `summary` | 약 281자 | 별도 `content`는 저장하지 않음 |
| 브런치스토리 검수 채널 | 미정 | 미검증 | 실제 채널 feed 확인 후 결정 |

Atom `content`와 RSS `content:encoded`는 존재하더라도 원문 전문일 수 있으므로 fallback으로 사용하지 않는다.

## 5. 전자신문 CharacterEncodingOverride 재검증

전자신문 feed를 `feedparser.parse(URL)`로 직접 열면 다음 결과가 나온다.

```text
version = rss20
bozo = true
bozo_exception = CharacterEncodingOverride(
  'document declared as us-ascii, but parsed as utf-8'
)
entries = 30
```

원인은 전자신문 HTTP 응답이 charset 없는 `Content-Type: text/xml`이고, XML 본문은 `encoding="utf-8"`이기 때문이다. feedparser가 HTTP 요청까지 담당하면 HTTP/XML 인코딩 우선순위에 따라 처음에 `us-ascii`로 판단한 뒤 UTF-8로 복구하면서 경고를 남긴다.

그러나 실제 파이프라인 방식으로 HTTP client가 받은 bytes를 넘기면 결과가 다르다.

```text
feedparser.parse(response_bytes)
version = rss20
bozo = false
entries = 30
```

따라서 전자신문을 위한 bozo exception allowlist나 XML 전처리는 추가하지 않는다. 기존 계약대로 실제 fetcher의 response bytes를 파싱하고, 그 결과 `bozo=true`이면 `FEED_PARSE_ERROR`로 실패시킨다.

## 6. source 설정 초안

아래 값은 source DB 등록 전 fixture를 최종 확인하기 위한 초안이다.

| source | excerpt_field | default_reading_time_minutes | 주요 관심사 후보 |
| --- | --- | ---: | --- |
| 전자신문 | `summary` | 3 | AI, IT·개발 |
| 벤처스퀘어 뉴스 | `summary` | 5 | 스타트업·창업 |
| 브런치스토리 검수 채널 | 미정 | 7 | 선택한 채널에 따라 결정 |
| 우아한형제들 기술블로그 | `summary` | 7 | IT·개발, 디자인·UX·제품 |
| NAVER D2 | `summary` | 7 | IT·개발, AI |
| Toss Tech | `summary` | 5 | IT·개발, 디자인·UX·제품 |
| DEVOCEAN | `summary` | 7 | IT·개발, AI |
| 요즘IT 컬럼 | `summary` | 7 | IT·개발, 디자인·UX·제품, 커리어·일하는 방식 |

source interest는 모든 수집 글에 그대로 상속된다. 따라서 한 source에 관심사를 넓게 붙이기 전에 최근 feed 표본이 해당 관심사에 일관되게 속하는지 확인해야 한다.

## 7. 초기 활성화 제안

### 바로 dry-run 가능한 5개

1. 전자신문
2. 벤처스퀘어 뉴스
3. 우아한형제들 기술블로그
4. NAVER D2
5. Toss Tech

이 다섯 source는 현재 파싱 계약으로 날짜까지 확보할 수 있다.

### 결정 후 활성화할 3개

- **DEVOCEAN:** feed의 `published`가 `Tue, 30 Jun 2026 13:04:43`처럼 timezone 없이 제공된다. 현재 계약대로면 `published_at=null`이고 추천 recency score가 `0.1`이다.
- **요즘IT 컬럼:** RSS item에 발행일 필드가 없다. timezone 설정으로도 해결되지 않으며, RSS only 범위에서는 `published_at=null`로 저장할 수밖에 없다.
- **브런치스토리:** 구체적인 무료 공개 작가 또는 매거진과 feed URL을 먼저 선택해야 한다.

## 8. 남은 결정

### DEVOCEAN 날짜 처리

1. `sources.feed_timezone='Asia/Seoul'`을 추가해 timezone 없는 날짜를 해석한다.
   - 장점: RSS only를 지키면서 추천 최신성을 확보한다.
   - 단점: source 설정 컬럼과 날짜 변환 계약이 하나 늘어난다.
2. timezone 컬럼 없이 `published_at=null`을 허용한다.
   - 장점: 현재 설계를 바꾸지 않는다.
   - 단점: recency score `0.1`로 사실상 오늘의 글 후보가 되기 어렵다.

실제 source에서 문제가 확인됐으므로 1안을 권고한다.

### 요즘IT 날짜 처리

1. RSS only 원칙을 유지하고 null 날짜를 수용한다.
2. 요즘IT은 초기 자동 추천 source에서 제외하고 후속 metadata crawl 때 활성화한다.

원문 또는 목록 페이지 크롤링을 이번 범위에 추가하지 않기 위해 2안을 권고한다.

### 브런치스토리 범위

플랫폼 전체가 아니라 무료 공개 상태가 안정적인 작가 또는 매거진을 선택한다. 선택 후 RSS/Atom 지원 여부, bozo, 발행일, 발췌문이 전문인지 소개문인지 다시 검증한다.

### 최초 save 순서

서로 다른 source가 같은 canonical URL을 제공하면 먼저 저장된 source의 ownership과 interest tag가 유지된다. dry-run 결과를 비교한 뒤 최초 save 순서를 별도로 확정한다.
