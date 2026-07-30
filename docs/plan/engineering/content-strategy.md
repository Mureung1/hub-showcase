# 깸 콘텐츠 수집/저장/노출 전략

## 1. 핵심 방향

깸은 사용자가 콘텐츠를 많이 소비하게 만드는 뉴스 앱이 아니다. 핵심은 관심 있는 글이나 영상을 보고, 그 내용을 그대로 넘기지 않고 질문/반박/연결/표현 중 하나의 사고 행동으로 전환하게 만드는 것이다.

따라서 콘텐츠 전략의 기준은 다음과 같다.

1. 원문을 대체하지 않는다.
2. AI 요약을 먼저 보여주지 않는다.
3. 제목, 출처, 공식 설명, 원문 링크를 제공한다.
4. 사용자가 직접 읽고 판단한 뒤 생각을 남기게 한다.
5. 관심사 기반 추천을 하되, 같은 관점만 반복 노출하지 않는다.

## 2. 콘텐츠 소스 범위

MVP에서는 논문, 장문 보고서, PDF 중심 콘텐츠는 제외한다. 이들은 신뢰도는 높지만 매일 5~15분 안에 읽고 생각을 남기는 서비스 경험에는 무겁다.

MVP 콘텐츠는 아래 세 가지로 제한한다. 단, 기본 사용자 경험은 한국어 원문을 우선한다. 영어 원문은 품질이 높더라도 매일 5~15분 안에 읽고 생각을 남기는 흐름을 방해할 수 있으므로 기본 추천 풀의 중심에 두지 않는다.

| 구분 | 역할 | 예시 | 수집 우선순위 |
| --- | --- | --- | --- |
| 뉴스 | 현재 이슈 제공 | 전자신문, 한국경제, 경향신문, 동아일보, 한겨레, 벤처스퀘어, 아웃스탠딩 | RSS 우선 |
| 공식 블로그 | 원출처 관점 제공 | Naver D2, Toss Tech, Kakao Tech, LINE Engineering, 우아한형제들 기술블로그, 당근 테크 블로그 | RSS/Atom 우선, 없으면 수동 등록 |
| 전문 아티클 | 실무자/전문가 해석 제공 | 요즘IT, 원티드 블로그, 폴인/퍼블리 공개 글, 브런치스토리의 검수된 전문 글 | RSS/뉴스레터/수동 등록 |

### 언어 정책

`원문을 대체하지 않는다`는 원칙을 지키려면 사용자가 실제로 읽을 수 있는 원문을 추천해야 한다. 따라서 MVP에서는 한국어 원문을 기본값으로 둔다.

| 구분 | MVP 처리 |
| --- | --- |
| 한국어 원문 | 기본 추천 풀 |
| 영어 원문 | 선택/심화 추천 풀 |
| 영어 원문의 AI 요약 | 기본 제공하지 않음 |
| 영어 원문 제목/공식 설명의 보조 번역 | 가능. 단, 원문 대체 수준의 요약은 금지 |
| 영어 원문 추천 비율 | 기본 10~20% 이내 |

영어 소스는 `글로벌 관점 보기`, `심화 읽기`, `영어 원문도 괜찮아요` 같은 사용자 설정이 켜진 경우에 우선 노출한다.

### 제외 또는 후순위 콘텐츠

| 콘텐츠 | MVP 처리 |
| --- | --- |
| 논문 | 후순위. 나중에 깊게 읽기 모드에서 검토 |
| 정부/기관 보고서 | 후순위. 짧은 공식 소개문이 있는 경우만 후보 |
| PDF 전문 | 저장하지 않음 |
| 원문 전문 크롤링 | MVP에서는 하지 않음 |
| AI 생성 요약 | 사용자에게 먼저 보여주지 않음 |

## 3. 수집 방식

### 현재 MVP

1. 사전에 검수해 DB에 등록한 한국어 `primary` RSS/Atom 소스를 대상으로 한다.
2. 운영자가 다중 source CLI를 수동 실행한다.
3. RSS가 제공하는 제목, URL, 발행일, 저자, 공식 설명과 썸네일 URL 등 메타데이터만 수집한다.
4. 원문 전문과 AI 요약은 저장하지 않는다.
5. 현재 구현 계약은 [`content-pipeline.md`](content-pipeline.md)를 기준으로 한다.

### 장기 전략 후보

- 공식 API를 이용한 수집
- 관리자 화면을 통한 수동 콘텐츠 등록
- 제목·설명·썸네일 등 OG 메타데이터의 제한적 보강
- 자동 scheduler와 영속 실행 이력·실패 알림

위 항목은 현재 MVP 기능이 아니며, RSS 수집만으로 콘텐츠 운영이 부족하다는 근거가 확인된 뒤 별도로 설계한다. 원문 전문 저장을 위한 크롤링은 장기 전략에도 포함하지 않는다.

### 수집 가능한 데이터

| 데이터 | 저장 여부 | 설명 |
| --- | --- | --- |
| 제목 | 저장 | 현재 MVP는 RSS/Atom title |
| 제목 보조 번역 | 선택 저장 | 영어 원문일 때만 한국어 탐색 보조용으로 사용 |
| URL | 저장 | canonical URL 기준 |
| 출처 | 저장 | source_id로 연결 |
| 발행일 | 저장 | 현재 MVP는 RSS/Atom published 또는 updated |
| 저자 | 가능하면 저장 | 없으면 null |
| 공식 설명 | 저장 | 현재 MVP는 source별로 허용한 RSS/Atom 공식 설명 필드 |
| 공식 설명 보조 번역 | 선택 저장 | 원문 설명의 직역/의역 수준. 핵심 요약으로 확장하지 않음 |
| 썸네일 URL | 저장 | 이미지 파일 자체가 아니라 URL 저장 |
| 카테고리/태그 | 저장 | 현재 MVP는 source 관심사를 상속하는 `source_rule` |
| 읽기 시간 | 선택 저장 | 본문 전문을 저장하지 않으므로 정확값이 아니라 추정값으로 저장 |
| URL 상태 | 저장 | active / broken / paywalled / removed |
| 본문 전문 | 저장하지 않음 | 저작권/서비스 방향성 문제 |
| AI 요약 | 사용자 노출용으로 저장하지 않음 | 내부 분류 보조는 별도 검토 |

### 읽기 시간 계산 정책

`reading_time_minutes`는 정확한 독서 시간이 아니라 추천 카드에서 사용자의 부담을 가늠하게 하는 추정값이다. 본문 전문을 저장하지 않는 원칙과 충돌하지 않도록 MVP에서는 아래 순서로 계산한다.

1. 현재 검수된 source는 source별 기본값을 사용한다.
2. 향후 RSS/Atom이 검증 가능한 읽기 시간 필드를 제공하는 source가 생기면 `source_meta` 사용을 별도로 연결한다.
3. 본문을 다운로드해서 글자 수를 세는 방식은 MVP에서 사용하지 않는다.

소스별 기본값 예시:

| 콘텐츠 유형 | 기본 읽기 시간 |
| --- | ---: |
| 짧은 뉴스 | 3분 |
| 일반 뉴스/블로그 | 5분 |
| 전문 아티클 | 7분 |
| 영어 원문 | 8분 |
| 영상 | 영상 길이 또는 10분 기본값 |

정확한 시간이 불확실하면 카드에서 `약 5분`처럼 표시하고, `reading_time_source`를 `source_meta / source_default / manual` 중 하나로 저장한다.

## 4. 장기 전략 후보: 제한적 크롤링 정책

현재 MVP는 크롤링하지 않는다. RSS가 제공하는 정보가 부족해 카드 품질 문제가 확인된 경우에만 메타데이터 보강 수단으로 별도 검토한다.

허용 범위:

- `og:title`
- `og:description`
- `og:image`
- `canonical_url`
- `published_time`
- `author`

비허용 범위:

- 본문 전체 저장
- 기사/블로그 전문 재노출
- 유료 콘텐츠 우회 수집
- 무료/유료가 섞인 소스에서 유료 글을 무료 글처럼 노출
- 원본 이미지 파일을 허락 없이 다운로드해 자체 CDN에 재배포
- robots.txt 또는 서비스 약관을 무시한 수집
- 원문을 읽지 않아도 될 정도의 AI 요약 생성

크롤링은 좋은 콘텐츠를 많이 가져오기 위한 수단이 아니라, 이미 가져온 콘텐츠의 카드 표시 품질을 높이는 보조 수단으로만 사용한다.

### 썸네일 정책

MVP에서는 썸네일 이미지를 직접 저장하지 않고 URL만 저장한다. 다만 원본 사이트가 핫링크를 막거나 이미지가 깨질 수 있으므로, 썸네일은 필수 UI 요소로 두지 않는다.

처리 기준:

1. RSS/OG가 썸네일 URL을 제공하면 `thumbnail_url`에 저장한다.
2. 앱에서 이미지 로딩에 실패하면 즉시 출처명/콘텐츠 유형 기반의 기본 플레이스홀더를 보여준다.
3. 이미지가 없어도 카드 레이아웃이 깨지지 않게 설계한다.
4. 원본 이미지를 다운로드해서 자체 저장하는 것은 MVP에서 하지 않는다.
5. 제휴 또는 명시적 허용이 생긴 소스에 한해 나중에 자체 캐싱을 검토한다.

### 유료/부분 유료 콘텐츠 필터링

무료/유료 글이 섞인 소스는 기본적으로 `optional` 또는 `advanced`로 둔다. 자동 수집 시 아래 신호가 있으면 추천 후보에서 제외하거나 `paywalled`로 표시한다.

제외 신호:

- URL, 제목, 설명에 `premium`, `paid`, `members`, `subscribe`, `구독`, `유료`, `멤버십` 등 명시적 신호가 있음
- RSS description이 거의 없고 원문 접근 시 구독 유도 페이지만 확인됨
- 소스 자체가 유료 뉴스레터 중심임
- 운영자가 해당 소스를 `paywall_risk = high`로 지정함

저장 정책:

```sql
articles
- access_type text default 'free'
  -- free / partial_free / paywalled / unknown
- thumbnail_status text default 'unknown'
  -- unknown / ok / failed / blocked
- url_status text default 'active'
  -- active / broken / paywalled / removed
```

MVP 자동 추천에는 `access_type = free`만 사용한다. `partial_free`는 자동 추천하지 않고 운영자가 무료 범위를 확인한 수동 큐레이션 후보로만 다룬다. `paywalled`와 `unknown`은 노출하지 않는다.

## 5. 저장 구조

현재 스키마가 `articles`를 중심으로 되어 있다면 이름은 유지해도 된다. 다만 개념상 뉴스, 블로그, 영상, 전문 아티클까지 포함하므로 장기적으로는 `contents`가 더 적절하다.

### sources

콘텐츠 출처를 저장한다.

```sql
sources
- id uuid primary key
- name text not null
- homepage_url text
- feed_url text
- source_type text not null
  -- news / official_blog / expert_article
- collection_method text not null
  -- rss / api / manual / metadata_crawl
- trust_level text not null
  -- high / medium / low
- source_quality_score numeric default 0.7
- paywall_risk text default 'low'
  -- low / medium / high
- perspective_type text not null
  -- media_view / vendor_view / practitioner_view / public_interest
- language text default 'ko'
- default_exposure text default 'primary'
  -- primary / optional / advanced
- active boolean default true
- created_at timestamptz default now()
```

### source_interests

출처와 관심사의 기본 연결을 저장한다.

```sql
source_interests
- source_id uuid references sources(id)
- interest_id uuid references interests(id)
- weight numeric default 1.0
- primary key (source_id, interest_id)
```

예를 들어 `Toss Tech`는 `개발`, `제품`, `금융`, `커리어`에 연결될 수 있고, `Naver D2`는 `개발`, `AI`, `기술`, `데이터`에 연결될 수 있다. 영어 소스인 `OpenAI News`는 `AI`, `기술`, `교육`에 연결할 수 있지만 `default_exposure`를 `optional`로 둔다.

### articles 또는 contents

개별 콘텐츠 메타데이터를 저장한다.

```sql
articles
- id uuid primary key
- source_id uuid references sources(id)
- title text not null
- canonical_url text not null unique
- published_at timestamptz
- author text
- content_type text not null
  -- article / blog / video
- source_type text not null
  -- news / official_blog / expert_article
- official_excerpt text
- translated_title text null
- translated_excerpt text null
- thumbnail_url text
- reading_time_minutes integer
- reading_time_source text
  -- source_meta / source_default / manual
- difficulty_level text
  -- easy / medium / hard / unknown
- stance text
  -- pro / con / neutral / mixed / unknown
- debate_topic_id uuid null
- quality_score numeric default 0
- language text default 'ko'
- access_type text default 'free'
  -- free / partial_free / paywalled / unknown
- thumbnail_status text default 'unknown'
  -- unknown / ok / failed / blocked
- url_status text default 'active'
  -- active / broken / paywalled / removed
- last_checked_at timestamptz null
- metadata jsonb default '{}'::jsonb
- created_at timestamptz default now()
```

`official_excerpt`는 AI 요약이 아니라 원출처가 제공한 설명만 저장한다.
`translated_title`과 `translated_excerpt`는 영어 원문 탐색을 돕는 보조 정보다. 이 필드는 원문을 대체하는 요약이 아니며, 카드에서 보이더라도 원문 링크와 함께 표시한다.

### quality_score 계산 정책

`quality_score`는 글의 사상이나 결론이 옳다는 점수가 아니다. 1인 개발자가 매일 개별 글을 평가할 수 없으므로, MVP에서는 출처 신뢰도와 접근성 중심의 기계적 점수로만 사용한다.

현재 MVP 계산:

```text
quality_score =
source_quality_score
+ 0.10  # free access
+ metadata_bonus
```

현재 점수와 선필터 기준:

| 항목 | 기준 | 점수 |
| --- | --- | ---: |
| source_quality_score | `trust_level = high` | 0.80 |
| source_quality_score | `trust_level = medium` | 0.60 |
| source_quality_score | `trust_level = low` | 자동 추천 제외 |
| free access bonus | `access_type = free` | +0.10 |
| metadata_bonus | 공식 설명/발행일/저자 중 2개 이상 있음 | +0.05 |
| source eligibility | active, RSS, 한국어, primary, low paywall risk | 하나라도 아니면 수집 대상 제외 |
| access eligibility | `access_type = free` | 아니면 저장·자동 추천 제외 |

MVP 자동 추천 기준:

```text
quality_score >= 0.65
and access_type = 'free'
and url_status = 'active'
and source.trust_level in ('high', 'medium')
```

클릭베이트·고위험 주제 감점과 운영자의 점수 수동 보정은 현재 수집 파이프라인에 없다. 필요성이 확인되면 별도 규칙과 감사 계약을 설계한다.

### content_interest_tags

개별 콘텐츠와 관심사의 연결을 저장한다.

```sql
content_interest_tags
- content_id uuid references articles(id)
- interest_id uuid references interests(id)
- confidence numeric default 1.0
- tagging_method text not null
  -- source_rule / keyword_rule / admin / ai_assist
- primary key (content_id, interest_id)
```

### 장기 전략 후보: article_assignments

날짜별 추천 고정이나 노출 이력이 실제로 필요해질 경우 사용자에게 어떤 콘텐츠가 언제 노출되었는지 저장하는 테이블을 검토할 수 있다. 현재 MVP는 완료한 사고 기록만으로 반복 추천을 제외하므로 `article_assignments`를 만들지 않는다.

```sql
article_assignments
- id uuid primary key
- user_id uuid references auth.users(id)
- article_id uuid references articles(id)
- assigned_date date not null
- assignment_reason text
  -- interest_match / perspective_balance / source_diversity / manual_pick
- mission_type text
  -- question / rebuttal / connection / expression
- mission_anchor_type text
  -- whole_content / highlight / timestamp / user_quote
- completed_at timestamptz null
- opened_original_at timestamptz null
- returned_from_original_at timestamptz null
- minimum_engagement_met boolean default false
- created_at timestamptz default now()
```

이 구조는 확정된 현재 스키마가 아니며 후속 설계 예시다.

### mission_records

사용자의 완료된 사고 기록을 저장한다. 현재 확정 스키마는 [`db-schema.md`](db-schema.md)의 `mission_records`를 기준으로 하며 `article_assignment_id`를 사용하지 않는다.

```sql
mission_records
- id uuid primary key
- user_id uuid references auth.users(id)
- article_id uuid references articles(id)
- mission_type text not null
  -- question / rebuttal / connection / expression
- mission_prompt text not null
- user_answer text not null
- selected_quote text null
- anchor_type text not null
  -- whole_content / highlight / timestamp / user_quote
- created_at timestamptz default now()
```

### 장기 전략 후보: reading_events

원문을 실제로 읽었는지 완벽히 증명할 수는 없지만, 후속 측정 설계에서 최소한의 행동 신호가 필요해질 경우 별도 이벤트 테이블을 검토할 수 있다. 현재 MVP에는 `reading_events` 테이블이 없다.

```sql
reading_events
- id uuid primary key
- user_id uuid references auth.users(id)
- article_id uuid references articles(id)
- event_type text not null
  -- card_viewed / original_opened / returned / mission_started / mission_submitted
- occurred_at timestamptz default now()
- metadata jsonb default '{}'::jsonb
```

## 6. 관심사별 콘텐츠 배분

관심사마다 뉴스, 공식 블로그, 전문 아티클의 적정 비율을 다르게 둔다.

| 관심사 | 뉴스 | 공식 블로그 | 전문 아티클 | 이유 |
| --- | ---: | ---: | ---: | --- |
| AI | 20% | 40% | 40% | 한국어 공식/전문 글을 우선하고, 영어 원출처는 선택 슬롯으로 보강 |
| 개발/IT | 10% | 60% | 30% | 기술 블로그와 실무 아티클이 뉴스보다 유용함 |
| 스타트업/창업 | 40% | 20% | 40% | 투자/시장 뉴스와 창업자 경험 글이 모두 필요 |
| 경제/금융 | 50% | 30% | 20% | 최신성 높은 이슈가 중요하되 공식 관점 보강 필요 |
| 커리어/일하는 방식 | 20% | 30% | 50% | 실무자 경험과 방법론 글이 적합 |
| 심리/학습/자기계발 | 10% | 40% | 50% | 자극적 뉴스보다 교육형 아티클이 적합 |
| 러닝/건강 | 20% | 50% | 30% | 공식/전문 블로그 중심이 안전함 |
| 디자인/UX/제품 | 10% | 30% | 60% | 한국어 실무 사례와 제품/UX 전문 글이 사고 미션에 적합 |

20개 관심사 전체에 동일한 비율을 적용하지 않는다. 관심사 성격에 따라 콘텐츠 타입 배분을 다르게 둬야 추천 품질이 올라간다.

영어 원문 소스는 위 비율에 그대로 섞지 않는다. 기본 추천에서는 한국어 콘텐츠를 먼저 채우고, 부족한 관심사에 한해 영어 원문을 10~20% 이내로 보강한다.

### 20개 관심사 소스 seed 초안

아래 목록은 장기적인 소스 확장 후보이며 현재 등록된 source 목록이 아니다. 실제 등록 전에는 RSS/Atom 제공 여부, 접근성, 유료 여부와 fixture를 source별로 검증한다. 현재 자동 추천은 검증 후 등록된 한국어 `primary` RSS/Atom source만 사용한다.

| 관심사 | MVP 상태 | primary 후보 | optional/advanced 후보 | 비고 |
| --- | --- | --- | --- | --- |
| AI | 자동 추천 가능 | 전자신문 AI, 요즘IT AI/기술, Naver D2, Toss Tech | OpenAI News optional, Google AI/Developers optional, MIT Technology Review advanced | 영어 원출처는 심화 슬롯 |
| 개발/IT | 자동 추천 가능 | Naver D2, Toss Tech, Kakao Tech, LINE Engineering, 우아한형제들 기술블로그 | GitHub Blog optional | 한국어 기술 블로그 중심 |
| 스타트업/창업 | 자동 추천 가능 | 벤처스퀘어, 아웃스탠딩, 요즘IT 스타트업/제품, 원티드 블로그 | Y Combinator Blog optional, First Round Review advanced | 투자 뉴스와 창업자 경험 글 혼합 |
| 디자인/UX/제품 | 자동 추천 가능 | 요즘IT 디자인/기획, 원티드 블로그, 브런치스토리 검수 글, 당근/토스 제품 글 | Nielsen Norman Group optional, Figma Blog optional | 브런치는 수동 검수된 글만 |
| 경제 | 자동 추천 가능 | 한국경제, 한겨레 경제, 경향 경제, 동아일보 경제 | 한국은행/KDI 공식 글 optional | 시황보다 해설형 글 우선 |
| 재테크/금융 | 자동 추천 가능 | 토스피드, 카카오페이 블로그, 금융감독원 금융교육, 한국경제 금융 | 은행/증권사 블로그 optional | 투자 권유성 글은 제외 |
| 커리어/일하는 방식 | 자동 추천 가능 | 원티드 블로그, 리멤버 커뮤니티 공개 글, 요즘IT 커리어, 퍼블리 공개 글 | Google re:Work optional | 채용 광고성 글 제외 |
| 심리/마음 | 제한적 자동 추천 | 국립정신건강센터, 서울시 정신건강복지센터, EBS 지식채널/교육 글 | 해외 심리 블로그 optional | 의료 조언처럼 보이는 글 제외 |
| 러닝/건강 | 제한적 자동 추천 | 국민체육진흥공단/대한체육회 글, 러닝 전문 매체 후보, 건강보험공단 건강정보 | Garmin/Runner's World optional | 진단/치료 조언 제외 |
| 과학 | 자동 추천 가능 | 동아사이언스, 사이언스타임즈, IBS/한국천문연구원 등 기관 블로그 | NASA/Scientific American optional | 공식/교육형 글 우선 |
| 마케팅/브랜딩 | 자동 추천 가능 | 오픈애즈, 모비인사이드, 아이보스, 요즘IT 마케팅 글 | a16z marketing 글 advanced | 광고성 글 필터링 |
| 여행 | 자동 추천 가능 | 대한민국 구석구석, Visit Seoul, 지자체 관광공사 블로그, 마이리얼트립 공개 글 | 해외 관광청 optional | 예약/판매 글보다 경험/문화 글 우선 |
| 철학/생각 | 수동 큐레이션 우선 | 인문360, EBS 지식채널, 브런치스토리 검수 글 | Aeon optional | 자동 RSS 품질이 낮으면 수동 등록 |
| 역사/인문 | 자동 추천 가능 | 국사편찬위원회, 한국민족문화대백과, 국가유산청, 인문360 | History.com optional | 설명형/해설형 글 중심 |
| 영화·드라마 | 자동 추천 가능 | 씨네21, 한국영상자료원, 영화진흥위원회, 방송사 공식 매거진 | Letterboxd/해외 매체 optional | 리뷰는 스포일러 표시 필요 |
| 음악 | 자동 추천 가능 | 멜론 매거진, 지니 매거진, EBS 스페이스 공감, 한국대중음악상 글 | Pitchfork optional | 팬덤 논쟁성 글 제외 |
| 교육·학습법 | 자동 추천 가능 | EBS, K-MOOC, 교육부/기관 블로그, 클래스101/패스트캠퍼스 공개 글 | Coursera Blog optional | 광고성 강의 홍보 제외 |
| 자기계발 | 제한적 자동 추천 | 원티드 블로그, 퍼블리 공개 글, 세바시/교육형 글, 브런치스토리 검수 글 | 해외 productivity 글 optional | 과장된 성공담/동기부여 글 필터링 |
| 시사이슈 | 수동 큐레이션만 | 정책브리핑, 주요 언론 해설형 글, 팩트체크성 글 | 해외 공영/공식 소스 optional | MVP 자동 추천 제외 |
| 사회문제 | 수동 큐레이션만 | 정책브리핑, 공공기관/NGO 공개 자료, 주요 언론 해설형 글 | 국제기구 글 optional | MVP 자동 추천 제외 |

### 시사이슈/사회문제 처리 결정

`시사이슈`와 `사회문제`는 20개 관심사에서 바로 삭제하지 않는다. 다만 MVP에서는 자동 추천 관심사가 아니라 `수동 큐레이션 관심사`로 둔다.

처리 방식:

1. 온보딩에서 선택 가능하게 두되 `조심스럽게 선별한 글만 제공`이라는 안내를 붙인다.
2. 자동 RSS 수집 결과를 바로 추천하지 않는다.
3. `manual_pick` 또는 `curated_only`로 등록한 콘텐츠만 노출한다.
4. 충분한 운영 기준이 생기기 전까지 매일 추천을 보장하지 않는다.
5. 빈 상태에서는 대체 관심사 선택을 유도한다.

문구 예시:

```text
시사이슈와 사회문제는 자극적인 글보다 생각해볼 만한 글을 선별해서 제공해요.
오늘 준비된 글이 없으면 다른 관심사의 글을 먼저 보여드릴게요.
```

스키마로 관리하려면 `interests`에 아래 필드를 추가한다.

```sql
interests
- launch_status text default 'active'
  -- active / curated_only / hidden / preparing
- risk_level text default 'low'
  -- low / medium / high
- empty_state_message text null
```

## 7. 사용자에게 보여주는 방식

콘텐츠 카드는 요약 카드가 아니라 읽기 유도 카드여야 한다.

### 콘텐츠 카드 구성

```text
제목
출처 · 콘텐츠 유형 · 발행일
관심사 태그
읽는 데 약 N분
공식 소개문 일부
왜 추천됐는지
원문 보기
```

예시:

```text
Toss Tech
공식 블로그 · 개발/금융 · 5분

공식 소개:
원문에서 제공한 설명 일부

왜 추천됐나요?
개발 관심사에 맞고, 최근 뉴스 중심으로 읽어서 오늘은 실무 기술 블로그 관점의 글을 골랐어요.

원문 보기
```

영어 원문 카드의 경우:

```text
OpenAI News
공식 블로그 · AI · 영어 원문 · 6분

공식 소개:
원문에서 제공한 설명 일부

보조 번역:
공식 소개의 한국어 보조 번역. 단, 핵심 요약으로 확장하지 않음.

왜 추천됐나요?
AI 관심사에 맞고, 글로벌 원출처 관점을 볼 수 있는 글이에요.

원문 보기
```

미션 질문은 사용자가 원문을 열고 돌아온 뒤 미션 화면에서 제시한다.

## 8. 미션 연결 방식

현재 MVP의 미션은 콘텐츠 유형과 관계없이 글 전체를 대상으로 한다. 앱은 콘텐츠 전문을 저장·표시하지 않으며, 사용자는 외부 원문을 읽고 돌아와 미션을 수행한다.

```text
anchor_type = whole_content
selected_quote = null
```

앱 내 하이라이트, 기억나는 문장 입력, 발췌문 선택과 영상 타임스탬프 입력은 현재 MVP에서 사용하지 않는다. DB enum은 `highlight`, `user_quote`, `timestamp`를 저장할 수 있지만 현재 API는 이 값을 요청에서 받지 않고 `whole_content`로 고정한다.

MVP의 기본 흐름:

```text
1. 콘텐츠 카드 확인
2. 원문 링크로 이동
3. 원문을 읽거나 본 뒤 앱으로 돌아옴
4. 앱이 미션 1개를 추천
5. 사용자가 추천 미션을 수행하거나 다른 유형으로 변경
6. 사용자가 사고 기록 작성
7. 완료된 답변을 mission_records에 저장
```

### 장기 전략 후보

사용자 검증에서 글 전체 미션만으로 사고의 초점을 잡기 어렵다는 문제가 확인되면 하이라이트, 사용자 문장, 영상 타임스탬프를 별도 기능으로 검토한다. 원문 전문 저장과 재노출 금지 원칙은 이 경우에도 유지한다.

## 9. 미션 추천 규칙

사용자가 네 가지 미션 중 직접 고르게 하면 결정 피로가 생긴다. 따라서 앱이 기본 미션 1개를 추천하고, 사용자는 필요할 때만 바꿀 수 있게 한다.

현재 MVP는 서버가 관리하는 네 가지 고정 프롬프트 중 기본 미션 하나를 제공한다. 콘텐츠 분류나 사용자 수행 이력을 이용한 미션 개인화는 하지 않는다.

### 기본 미션 유형

| 미션 | 목적 | 예시 |
| --- | --- | --- |
| 질문 | 이해되지 않는 부분을 드러냄 | 이 글에서 아직 납득되지 않는 부분은 무엇인가? |
| 반박 | 주장과 전제를 검토함 | 이 주장에 반대한다면 어떤 근거를 들 수 있을까? |
| 연결 | 내 상황과 연결함 | 이 내용이 내 공부, 프로젝트, 생활과 어떻게 연결되는가? |
| 표현 | 내 입장을 정리함 | 이 글을 보고 난 내 입장을 3줄로 정리하면? |

### 장기 전략 후보: 콘텐츠 성격별 추천

| 조건 | 추천 미션 |
| --- | --- |
| 주장/단정이 강한 글 | 반박 |
| 개념 설명형 글 | 질문 |
| 사례/경험 중심 글 | 연결 |
| 감정/평가가 강한 글 | 표현 |
| 논쟁적 주제 | 반박 우선 |
| 사용자가 최근 반박 미션을 너무 많이 수행 | 질문/연결/표현으로 분산 |

## 10. 확증편향 방지 전략

관심사 기반 추천은 사용자가 좋아하는 주제에 진입하게 해주는 장점이 있지만, 같은 관점만 반복 노출하면 확증편향을 강화할 수 있다.

따라서 추천 알고리즘은 관심사만 보지 않고 아래 요소를 함께 본다.

```text
추천 점수 =
관심사 일치 점수
+ 최신성 점수
+ 출처 품질 점수
+ 읽기 난이도 적합성
+ 최근 안 본 source_type 보정
+ 최근 안 본 perspective_type 보정
- 같은 출처 반복 패널티
- 같은 stance 반복 패널티
- 유사 주제 반복 패널티
```

### stance 균형 규칙

논쟁적 주제에 대해서는 최근 노출된 stance 분포를 확인한다.

```text
최근 14일 동안 같은 debate_topic에서
특정 stance가 65% 이상이면
반대 stance 또는 neutral/mixed 글의 우선순위를 올린다.
```

MVP에서는 stance 자동 판별을 완벽하게 하려고 하지 않는다. 1인 개발 기준에서는 매일 stance를 수동 태깅하는 운영을 전제로 두면 안 된다. 따라서 대부분의 콘텐츠는 `stance = unknown`으로 두고, 아래 조건에 해당하는 콘텐츠만 태깅한다.

태깅 대상:

- 정치, 사회, 정책, 젠더, 이념, 교육제도처럼 논쟁성이 큰 주제
- 같은 이슈에 대해 찬반이 명확히 나뉘는 글
- 추천 화면에서 `다른 관점`으로 의도적으로 노출할 글

MVP에서 stance 균형 로직은 `unknown` 콘텐츠에는 적용하지 않는다. 대신 source_type, perspective_type, source 반복 제한을 기본 편향 방지 장치로 사용한다.

### source_type 균형 규칙

예를 들어 AI 관심사 사용자가 최근 뉴스만 많이 봤다면 공식 블로그나 전문 아티클을 우선한다.

```text
최근 7일 source_type 분포 확인
news가 70% 이상이면 official_blog 또는 expert_article 우선
official_blog가 70% 이상이면 media_view 또는 practitioner_view 우선
```

### 사용자 노출 문구

편향 방지 로직은 사용자에게 과하게 설명하지 말고, 자연스럽게 보여준다.

```text
오늘은 평소 보던 뉴스 대신 공식 블로그 관점의 글이에요.
최근 비슷한 주장 글을 많이 봐서, 다른 관점의 글을 골랐어요.
이 글은 같은 주제를 실무자 관점에서 다뤄요.
```

## 11. 콘텐츠 모더레이션과 소스 선정 기준

깸은 사용자의 사고를 넓히는 서비스이지, 자극적 논쟁을 많이 소비하게 하는 서비스가 아니다. 따라서 소스 선정 단계에서 최소한의 모더레이션 기준을 둔다.

### 제외할 콘텐츠

- 특정 집단에 대한 혐오, 비하, 차별을 조장하는 글
- 검증되지 않은 음모론이나 명백한 허위정보를 사실처럼 다루는 글
- 선정적 제목으로 클릭을 유도하는 글
- 과도하게 정파적이어서 반대 관점을 사고하기보다 진영 감정을 자극하는 글
- 의료, 투자, 법률 등 고위험 영역에서 단정적 행동 지시를 하는 글
- 유료 콘텐츠를 우회해야 읽을 수 있는 글

### 소스 선정 기준

| 기준 | 설명 |
| --- | --- |
| 출처 투명성 | 발행 주체, 저자, 소속 또는 운영사가 확인 가능해야 함 |
| 원문 접근성 | 로그인/유료 결제 없이 핵심 내용을 읽을 수 있어야 함 |
| 표현 품질 | 지나친 낚시성 제목, 혐오표현, 과장 표현이 반복되면 제외 |
| 관점 구분 | 공식 블로그는 `vendor_view`, 언론은 `media_view`, 실무 글은 `practitioner_view`로 구분 |
| 정치성 위험 | 정치/사회 소스는 MVP 기본 추천에서 후순위 또는 제외 |

1인 개발 단계에서는 정치/사회 논쟁 콘텐츠를 적극적으로 다루지 않는다. 확증편향 방지 실험은 먼저 AI, 기술, 커리어, 제품, 창업처럼 상대적으로 운영 리스크가 낮은 관심사에서 시작한다.

### 1인 운영 기준

운영자가 매일 모든 콘텐츠를 검수하는 방식은 MVP에 맞지 않다. 따라서 검수는 `소스 단위 사전 검수`를 기본으로 하고, 개별 콘텐츠 검수는 예외적으로만 한다.

MVP 운영 원칙:

1. 관심사별 소스는 3~5개만 등록한다.
2. `trust_level = high`, `access_type = free`, `language = ko`, `default_exposure = primary`인 소스만 자동 추천에 넣는다.
3. `stance`, `difficulty_level`은 대부분 `unknown`을 허용한다.
4. 정치/사회/고위험 주제는 자동 추천하지 않고 수동 등록한 글만 노출한다.
5. 사용자가 신고한 콘텐츠는 즉시 추천 후보에서 제외한다.

필요한 최소 관리자 작업:

| 주기 | 작업 |
| --- | --- |
| 최초 1회 | 관심사별 소스 3~5개 seed 등록 |
| 주 1회 | 깨진 링크/품질 낮은 소스 확인 |
| 필요 시 | 신고된 콘텐츠 비노출 처리 |
| 후순위 | stance/difficulty 수동 보정 |

## 12. AI 사용 원칙

깸에서 AI는 사용자의 사고를 대신하지 않는다. AI는 콘텐츠를 읽을 관점을 잡아주는 진행자 역할만 한다.

현재 MVP 수집·추천·미션 흐름은 AI 생성, AI 태깅과 AI 번역을 실행하지 않는다. 아래 목록은 후속 도입을 검토할 때의 허용 경계다.

### 후속 도입 시 허용

- 관심사 태깅 보조
- 난이도 태깅 보조
- 미션 추천 보조
- 읽기 전 질문 생성
- 영어 제목/공식 설명의 보조 번역
- 중복 콘텐츠 탐지
- stance 후보 태깅
- 부적절하거나 품질 낮은 콘텐츠 필터링 보조

### 비추천

- 원문 전체 요약 제공
- 핵심 내용 3줄 요약 먼저 보여주기
- 사용자가 읽기 전에 결론 정리해주기
- 논점과 한계를 AI가 대신 판단해 설명하기
- AI가 쓴 요약만 보고 미션을 수행하게 하기

### 보조 번역 정책

영어 원문을 선택/심화 추천으로 제공할 경우, `translated_title`과 `translated_excerpt`는 AI 자동번역으로 생성할 수 있다. 단, 이 번역은 원문을 대체하는 요약이 아니라 탐색 보조 정보다.

생성 기준:

1. 번역 대상은 `title`과 `official_excerpt`로 제한한다.
2. 원문에 없는 주장, 배경 설명, 의의, 한계를 추가하지 않는다.
3. 카드에는 `보조 번역`이라고 표시한다.
4. 사용자가 미션을 수행할 때는 원문 링크를 기준으로 읽었다고 안내한다.
5. 번역 생성 모델, 생성 시각, 원문 해시를 `metadata.translation`에 저장한다.

저장 예시:

```json
{
  "translation": {
    "provider": "ai",
    "target": ["title", "official_excerpt"],
    "generated_at": "2026-07-09T00:00:00Z",
    "source_hash": "..."
  }
}
```

오역 위험이 있으므로 영어 원문은 기본 추천의 중심이 아니라 optional/advanced로만 사용한다.

## 13. MVP 운영 방식

MVP에서는 매일 개별 콘텐츠를 검수하는 운영을 전제로 두지 않는다. 1인 개발 기준에서는 소스 단위로 미리 통제하고, 자동 수집 결과는 보수적인 규칙으로 필터링한다.

### 1단계: 소스 seed

관심사별로 신뢰 가능한 소스를 3~5개씩만 먼저 등록한다. 전체 목록은 `20개 관심사 소스 seed 초안` 표를 기준으로 한다.

등록 우선순위:

1. `MVP 상태 = 자동 추천 가능`인 관심사부터 등록한다.
2. `제한적 자동 추천`은 고위험 표현 필터와 소스 단위 검수 후 등록한다.
3. `수동 큐레이션만`인 시사이슈/사회문제는 자동 수집 추천에 넣지 않는다.
4. `optional`은 사용자가 영어 원문 허용 또는 심화 읽기를 켠 경우에만 기본 추천 후보에 넣는다.
5. `advanced`는 MVP 기본 추천에서는 제외하고 운영자 큐레이션 또는 후속 기능에서만 사용한다.

### 2단계: 수동 다중 source 수집

```text
운영자가 collect_sources --dry-run 실행
대상 source 수와 실패 여부 확인
필요할 때 collect_sources --save 실행
중복 URL 제거
출처/관심사 태깅
접근성 확인
유료 신호와 부적격 source 제외
```

자동 실행 주기, scheduler, 실행 이력과 실패 알림은 현재 운영 결과를 확인한 뒤 결정하는 장기 전략 후보이다.

### 3단계: 오늘의 콘텐츠 선정

```text
사용자 관심사 확인
최근 노출 이력 확인
source_type 균형 확인
태깅된 콘텐츠에 한해 stance 균형 확인
최종 후보 3개 생성
오늘의 글 1개 우선 노출
더보기로 2개 제공 가능
```

### 4단계: 미션 수행

```text
원문 보기
앱 복귀
미션 1개 추천
사용자 답변 작성
mission_records 저장
```

## 14. 완료 판정과 데이터 신뢰도

원문 링크로 나간 사용자가 실제로 글을 읽었는지 앱이 완벽히 증명할 수는 없다. 현재 MVP는 원문 열람 시도, 앱 복귀와 체류 시간을 측정하지 않으며 완료된 사고 기록만 저장한다.

MVP 완료 기준:

```text
빈 답변과 명시적인 무성의 답변은 저장하지 않는다.
유효한 미션 답변이 mission_records에 생성되면 "생각 기록 완료"다.
"읽음 완료"나 "최소 참여 시간 충족"으로 해석하지 않는다.
```

`opened_original_at`, `returned_from_original_at`, `minimum_engagement_met`는 현재 MVP에서 채우지 않고 DB 기본값 `null`, `null`, `false`로 둔다.

### 장기 전략 후보: 읽기 참여 측정

사고 기록 제출만으로 가설을 검증하기 부족하다는 근거가 확인되면 원문 열람과 앱 복귀 같은 최소 행동 신호를 별도로 설계할 수 있다. 측정을 도입하더라도 단순 체류 시간을 실제 독서 완료로 간주하지 않는다.

## 15. 깨진 링크와 삭제된 원문 처리

원문은 외부 사이트에 있으므로 시간이 지나면 삭제, 이동, 유료화, 404가 발생할 수 있다. 따라서 아카이브는 원문을 보장하는 저장소가 아니라 사용자의 사고 기록 저장소로 설계한다.

### 링크 상태 확인

```text
수집 시 1회 확인
추천 직전 1회 확인
이후 주 1회 또는 사용자가 열람할 때 비동기 확인
```

`canonical_url`이 열리지 않으면 `url_status`를 변경한다.

| 상태 | 처리 |
| --- | --- |
| active | 정상 노출 |
| broken | 오늘의 추천 후보에서 제외 |
| paywalled | 기본 추천 후보에서 제외 |
| removed | 원문 보기 버튼 대신 삭제 안내 표시 |

### 아카이브 화면 처리

원문이 사라져도 사용자의 사고 기록은 유지한다. 단, 원문 내용을 대신 복원해서 보여주지는 않는다.

```text
이 원문은 현재 열 수 없어요.
그래도 당시 남긴 생각 기록은 아래에서 볼 수 있습니다.
```

보여줄 수 있는 것:

- 저장된 제목
- 출처
- 발행일
- 당시 사용자에게 제시된 미션 질문
- 당시 사용자가 남긴 미션 답변

보여주지 않을 것:

- 삭제된 원문 전문 복원
- 캐시된 본문 재노출
- AI가 대신 재구성한 요약

## 16. 나중에 고도화할 것

MVP에서 바로 하지 않아도 되는 것:

- pgvector 기반 유사도 추천
- 본문 임베딩 기반 개인화
- 논문/보고서 깊게 읽기 모드
- 영상 자막 기반 자동 분석
- 자동 stance 판별 고도화
- 완전 자동 콘텐츠 품질 평가

도입 조건:

```text
저장 콘텐츠 1,000개 이상
또는 사용자별 완료 기록 20개 이상
또는 같은 관심사 내 추천 반복 문제가 관찰될 때
```

그 전까지는 소스 단위 사전 검수와 규칙 기반 추천만으로 시작한다. 개별 콘텐츠 운영자 검수는 신고, 고위험 주제, 수동 큐레이션 콘텐츠에 한정한다.

## 17. 최종 결정안

깸의 MVP 콘텐츠 전략은 다음과 같이 결정한다.

1. 뉴스, 공식 블로그, 전문 아티클만 우선 사용한다.
2. 논문/보고서/PDF는 MVP에서 제외한다.
3. 기본 추천 풀은 한국어 원문 중심으로 구성한다.
4. 영어 원문은 optional/advanced로 분리하고 기본 추천 비율을 10~20% 이내로 제한한다.
5. 콘텐츠 전문은 저장하지 않는다.
6. 현재 MVP는 검수된 RSS/Atom 소스를 수동 다중 source CLI로 수집한다.
7. 공식 API, 관리자 수동 등록과 제한적 메타데이터 크롤링은 장기 전략 후보로 둔다.
8. 사용자에게 AI 요약을 먼저 보여주지 않는다.
9. 영어 원문에는 제목/공식 설명의 보조 번역만 제공하고, 원문 대체 요약은 제공하지 않는다.
10. 보조 번역은 AI 자동번역을 허용하되 `보조 번역`으로 표시하고 원문에 없는 해석을 추가하지 않는다.
11. 20개 관심사 모두 최소 seed 후보를 갖되, 시사이슈/사회문제는 `curated_only`로 둔다.
12. 공식 설명과 원문 링크를 제공하고, 원문을 읽고 돌아온 뒤 글 전체 대상 미션을 제시한다.
13. 현재 MVP는 서버가 고정 미션 1개를 추천하고 사용자는 필요할 때 네 가지 유형 안에서 변경한다.
14. `reading_time_minutes`는 본문 크롤링 없이 소스 메타데이터 또는 소스별 기본값으로 추정한다.
15. `quality_score`는 출처 신뢰도, 무료 접근성, 메타데이터 품질, 링크 상태, 고위험 주제 여부로 기계적으로 계산한다.
16. 썸네일은 URL만 저장하고, 실패 시 기본 플레이스홀더를 보여준다.
17. 유료/부분 유료 콘텐츠는 자동 추천에서 제외하거나 명시적으로 표시한다.
18. 관심사 기반 추천을 하되 source_type, perspective_type 균형을 기본으로 보고, stance 균형은 태깅된 논쟁 주제에 한해 적용한다.
19. 완료는 `읽음`이 아니라 `생각 기록 완료`로 해석한다.
20. 깨진 링크나 삭제 원문은 원문을 복원하지 않고, 사용자의 사고 기록만 유지한다.
21. 노출 이력과 사고 기록을 분리하는 방향은 유지하되, 현재 MVP는 완료된 사고 기록을 `mission_records`에 저장하고 별도의 날짜별 배정은 사용하지 않는다.
22. 하이라이트·사용자 문장 입력과 읽기 참여 측정은 현재 MVP에서 사용하지 않으며 필요성이 확인되면 후속으로 검토한다.

이 구조를 따르면 깸은 콘텐츠 추천 서비스가 아니라, 콘텐츠를 매개로 사용자의 사고 흔적을 남기는 서비스라는 정체성을 유지할 수 있다.
