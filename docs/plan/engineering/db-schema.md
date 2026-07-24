# 깸 DB 설계서 (Supabase / PostgreSQL)

프로젝트: `kckcammmmm` (Supabase, ap-southeast-1, PostgreSQL 17)
사용자 식별: Supabase Anonymous Sign-in → `auth.users`를 그대로 참조 (별도 `users` 테이블 없음)
접근 구조: 사용자 데이터는 FastAPI가 publishable key와 사용자 JWT로 접근해 RLS를 적용하고, RSS 수집 같은 사용자와 무관한 배치 작업만 secret key로 접근

---

## 전체 구조

테이블은 세 덩어리로 나뉜다.

1. **관심사**: `interests`, `user_interests`
2. **콘텐츠**: `sources`, `source_interests`, `debate_topics`, `articles`, `content_interest_tags`
3. **사고 기록**: `mission_records`

그리고 관심사 전체 교체, 추천, RSS 저장을 담당하는 함수 `replace_user_interests`, `get_recommended_articles`, `ingest_rss_article`이 있다.

```
auth.users
 ├─ 1:N → user_interests → N:1 → interests
 └─ 1:N → mission_records → N:1 → articles

sources
 ├─ 1:N → articles
 └─ N:M → interests (source_interests, 태깅 수집 시 confidence 재료로 사용)

articles
 ├─ N:M → interests (content_interest_tags)
 └─ N:1 → debate_topics (찬반 논쟁 글 클러스터링, nullable)
```

---

## 1. interests — 관심사 마스터

| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| name | text, unique | 관심사 이름 (AI, IT·개발 등 20개) |
| display_order | smallint, unique | 관심사 설정 화면에서 처음 10개 / 더보기 10개를 나누는 순번 |
| launch_status | text (`active`/`curated_only`/`hidden`/`preparing`) | 시사이슈·사회문제처럼 자동 추천은 안 하고 수동 큐레이션만 하는 관심사 구분 |
| risk_level | text (`low`/`medium`/`high`) | 논쟁 위험도 |
| empty_state_message | text, nullable | 콘텐츠가 부족할 때 보여줄 안내 문구 (시사이슈·사회문제에 설정됨) |

한 곳에 정의해두고 사용자·소스·콘텐츠가 모두 이 테이블을 참조하는 기준 데이터다.

## 2. user_interests — 사용자 ↔ 관심사

| 필드 | 타입 | 설명 |
|---|---|---|
| user_id | uuid, FK → auth.users(id) | |
| interest_id | uuid, FK → interests(id) | |
| created_at | timestamptz | |

PK는 `(user_id, interest_id)`. 사용자 1명이 관심사 여러 개를, 관심사 1개가 여러 사용자에게 선택되는 다대다 관계라 중간 테이블이 필요하다.

## 3. sources — 콘텐츠 출처

| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| name | text | 전자신문, 한국경제 등 |
| homepage_url / feed_url | text, nullable | |
| source_type | text (`news`/`official_blog`/`expert_article`) | |
| collection_method | text (`rss`/`api`/`manual`/`metadata_crawl`) | |
| trust_level | text (`high`/`medium`/`low`) | 자동 추천 여부를 가르는 신뢰도 |
| perspective_type | text (`media_view`/`vendor_view`/`practitioner_view`/`public_interest`) | 관점 균형 로직이 참조 |
| language | text, default 'ko' | |
| default_exposure | text (`primary`/`optional`/`advanced`) | 영어 원문처럼 사용자가 설정을 켰을 때만 노출할 소스 구분 |
| active | boolean | |
| source_quality_score | numeric, default 0.7 | `articles.quality_score` 계산 재료 |
| paywall_risk | text (`low`/`medium`/`high`) | |
| content_type | text (`article`/`blog`/`video`) | 수집 글에 적용할 콘텐츠 유형 |
| excerpt_field | text (`summary`/`description`/`none`) | 저장을 허용한 feed 공식 소개문 필드 |
| default_reading_time_minutes | integer (`1..60`) | feed에 읽기 시간이 없을 때 사용할 기본값 |
| feed_timezone | text, nullable (`Asia/Seoul`) | timezone이 없는 RSS 날짜의 source별 fallback |

소스 속성은 잘 안 바뀌고 콘텐츠는 매일 쏟아지므로, 매 글마다 신뢰도·관점을 중복 저장하지 않고 `sources`를 참조만 하도록 분리했다.

## 4. source_interests — 소스 ↔ 관심사

| 필드 | 타입 | 설명 |
|---|---|---|
| source_id | uuid, FK → sources(id) | |
| interest_id | uuid, FK → interests(id) | |
| weight | numeric, default 1.0 | |

PK는 `(source_id, interest_id)`. **역할**: 콘텐츠 수집 시점에 이 값을 그대로 `content_interest_tags.confidence`로 상속시켜, 새 글이 자동으로 관심사 태깅되게 하는 재료다 (`tagging_method = 'source_rule'`). 추천 계산에는 직접 쓰이지 않는다.

## 5. debate_topics — 찬반 논쟁 주제 클러스터

| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| title | text | 예: "원격근무 확대 찬반" |
| created_at | timestamptz | |

여러 글이 같은 논쟁 주제를 다룰 때 묶는 라벨. 확증편향 방지 로직이 "같은 주제 안에서 stance가 쏠렸는지"를 확인하려면 글들을 주제 단위로 묶을 방법이 필요해서 만들었다.

## 6. articles — 콘텐츠 메타데이터 (본문 전문 저장 안 함)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| source_id | uuid, FK → sources(id), nullable | |
| title | text | |
| canonical_url | text, unique | |
| published_at | timestamptz, nullable | |
| author | text, nullable | |
| content_type | text (`article`/`blog`/`video`) | |
| source_type | text (`news`/`official_blog`/`expert_article`) | |
| official_excerpt | text, nullable | 본문 대신 원출처 공식 소개문만 저장 |
| translated_title / translated_excerpt | text, nullable | 영어 원문 탐색 보조 번역 (원문 대체 아님) |
| thumbnail_url | text, nullable | 이미지 파일이 아니라 URL만 저장 |
| reading_time_minutes | integer, nullable | 추정값 |
| reading_time_source | text (`source_meta`/`source_default`/`manual`) | 추정 근거 |
| difficulty_level | text (`easy`/`medium`/`hard`/`unknown`), default 'unknown' | |
| stance | text (`pro`/`con`/`neutral`/`mixed`/`unknown`), default 'unknown' | 논쟁성 큰 주제만 태깅, 나머지는 unknown 허용 |
| debate_topic_id | uuid, FK → debate_topics(id), nullable | |
| quality_score | numeric, default 0 | 자동 추천 임계값(0.65) 판정에 사용 |
| language | text, default 'ko' | |
| access_type | text (`free`/`partial_free`/`paywalled`/`unknown`), default 'free' | 유료 콘텐츠 자동 추천 제외용 |
| thumbnail_status | text (`unknown`/`ok`/`failed`/`blocked`), default 'unknown' | |
| url_status | text (`active`/`broken`/`paywalled`/`removed`), default 'active' | 깨진 링크 대응 |
| last_checked_at | timestamptz, nullable | |
| metadata | jsonb, default '{}' | AI 번역 생성 이력 등 부가 정보 |
| created_at | timestamptz | |

필드 대부분이 "본문 전문은 저장하지 않는다"는 원칙 때문에 생긴 대체 필드다. 원문이 외부에 있으므로 유료화·이미지 깨짐·링크 소실 상태를 계속 추적해야 해서 상태값 컬럼이 많다.

## 7. content_interest_tags — 콘텐츠 ↔ 관심사

| 필드 | 타입 | 설명 |
|---|---|---|
| content_id | uuid, FK → articles(id) | |
| interest_id | uuid, FK → interests(id) | |
| confidence | numeric, default 1.0 | 추천 점수의 "관심사 일치 점수"로 직접 사용됨 |
| tagging_method | text (`source_rule`/`keyword_rule`/`admin`/`ai_assist`) | 이 태그가 어떻게 생겼는지 감사 기록 |

PK는 `(content_id, interest_id)`. 글 하나가 여러 관심사에 걸칠 수 있어 다대다 중간 테이블로 뺐다.

## 8. mission_records — 사고 기록 (= 사고 로그 아카이브)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| user_id | uuid, FK → auth.users(id) | |
| article_id | uuid, FK → articles(id) | |
| mission_type | text (`question`/`rebuttal`/`connection`/`expression`) | |
| mission_prompt | text | 실제로 보여준 질문 문구를 그대로 저장 (나중에 문구가 바뀌어도 과거 기록은 그대로) |
| user_answer | text, `char_length > 0` | |
| selected_quote | text, nullable | |
| anchor_type | text (`whole_content`/`highlight`/`timestamp`/`user_quote`) | |
| opened_original_at | timestamptz, nullable | 원문 열람 시각 |
| returned_from_original_at | timestamptz, nullable | 원문에서 돌아온 시각 |
| minimum_engagement_met | boolean, default false | 최소 참여 시간 충족 여부 |
| created_at | timestamptz | 사실상 "제출(완료) 시각" |

**이 테이블 하나가 "오늘의 미션 수행 기록"과 "사고 로그 아카이브"를 겸한다.** 원래는 "무엇을 추천했는지"(`article_assignments`)와 "참여 신호"(`reading_events`)를 별도 테이블로 뒀었지만, 실제로 필요한 건 "사용자가 완료한 사고 기록"뿐이라 판단해 두 테이블을 없애고 참여 신호 필드를 이 테이블에 흡수했다. 트레이드오프: "추천은 됐지만 완료 안 한 글"에 대한 이력은 더 이상 남지 않는다 — 반복 추천 회피는 "완료한 글만 제외"하는 방식으로 단순화됐다.

---

## DB 함수

### replace_user_interests(interest_ids)

사용자 JWT의 `auth.uid()`를 기준으로 관심사 1~3개를 전체 교체한다. ID 개수·중복·존재 여부·선택 가능한 `launch_status`를 검증하고, 사용자별 transaction advisory lock으로 동시 요청을 직렬화한다. `anon` 실행은 금지하고 `authenticated`, `service_role`만 실행할 수 있다.

### get_recommended_articles(user_id, limit)

Postgres 함수로 구현했다. 관심사 일치, 최신성, 출처 품질, 반복 패널티를 계산해 점수순으로 후보를 반환한다.

| 요소 | 계산 근거 |
|---|---|
| 관심사 일치 점수 | 사용자가 고른 관심사와 매칭되는 `content_interest_tags.confidence` 합산 (최대 1.0) |
| 최신성 점수 | 발행 2일 이내 1.0 / 7일 이내 0.5 / 그 외 0.1 |
| 출처 품질 점수 | `sources.source_quality_score` |
| 같은 출처 반복 패널티 | 최근 14일간 같은 출처를 읽은 횟수 × -0.1 |
| stance 쏠림 패널티 | 논쟁 주제 글에 한해, 최근 14일간 같은 debate_topic에서 같은 stance가 65% 이상이면 -0.3 |

자동 추천 대상 필터: `access_type = 'free'`, `url_status = 'active'`, `quality_score >= 0.65`, `trust_level in ('high','medium')`, `default_exposure = 'primary'`, 이미 `mission_records`에 있는 글 제외.

아직 구현하지 않은 것 (나중에 추가): 사용자 난이도 선호 기반 적합성 점수, 최근 안 본 source_type/perspective_type 균형 보정. 사용자 선호 난이도 데이터가 아직 없고, 균형 보정은 비율 계산이 한 단계 더 필요해서 1차 구현에서는 제외했다.

호출 예시:
```sql
select * from get_recommended_articles('사용자-uuid', 3);
```

### ingest_rss_article(source_id, article)

RSS 수집기가 검증한 article 하나를 저장하고 source의 관심사 태그를 함께 생성한다. canonical URL 중복이면 기존 article과 태그를 갱신하지 않고 `duplicate`를 반환한다. 신규 article과 태그 저장은 한 transaction이며, `PUBLIC`, `anon`, `authenticated` 실행은 금지하고 backend privileged role만 실행할 수 있다.

---

## 의도적으로 만들지 않은 것

- **오늘의 글 배정 테이블**: "완료한 기록"만 있으면 충분하다고 판단해 제거. 반복 추천 회피는 완료 여부 기준으로만 동작.
- **참여 이벤트 로그 테이블**: `mission_records`의 타임스탬프 필드로 대체.
- **미션 유형 마스터 테이블**: 값이 4개로 고정이라 `text + check` 제약으로 충분.
- **커스텀 users 테이블**: Supabase Anonymous Sign-in으로 `auth.users`를 그대로 사용.
