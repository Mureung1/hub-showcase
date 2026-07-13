# 데이터·스키마 명세서 (개발용)

plan.md의 부록을 구현 수준으로 푼 문서. 정확한 변수명과 타입, 스크래퍼 원본 포맷,
LLM 프롬프트와 강제할 JSON 구조를 담는다.

우대 조건 처리(단순화): MVP에서는 우대·우선 조건을 매칭에 쓰지 않는다. 필수 조건만 구조화해서
판정하고, 우대 문구는 원문에 있으면 표시만 한다. (우대까지 구조화하면 복잡도만 커지고 정확도가 떨어짐)

---

## 핵심 규칙 (이 문서가 단일 소스, 코드는 여기 맞춘다)

소스는 값을 두 방식으로 준다. API(온통청년 등)나 일부 사이트는 분야, 대상, 지역, 연령을 자체 분류로 이미
구조화해 주고, 나머지는 자격요건이 자유 문장으로만 온다. 그래서 전부 LLM에 맡기지 않는다. 구조로 오는 값은
표로 매핑하고, LLM은 자유문장으로 된 참가조건만 맡는다. 이게 정확도와 비용을 같이 낮춘다.

### 어휘는 양쪽 다 정해진 값(canonical)으로만 저장한다

- 전공 8개: 인문, 경영, 경제, 교육, 과학, IT, 의학, 예술
- 지역 13개: 서울, 경기, 인천, 부산, 대구, 광주, 대전, 울산, 강원, 충청, 전라, 경상, 제주

프로필도 이 값, 공고 자격요건도 이 값으로만 저장한다. 원문의 넓은 표현은 이 집합으로 펼쳐서 저장한다.
- 이공계 -> [과학, IT, 의학] / 상경, 상경계열 -> [경영, 경제] / 인문사회 -> [인문, 경영, 경제, 교육] / 예체능 -> [예술]
- 전공 무관, 전체, 누구나 -> [] (무관)
- 수도권 -> [서울, 경기, 인천] / 영남, 영남권 -> [부산, 대구, 울산, 경상] / 호남, 호남권 -> [광주, 전라] / 충청권 -> [대전, 충청]
- 전국, 지역 무관 -> [] (무관)

소스가 분야 태그를 구조로 주면 이 표로 매핑한다 (웹/모바일/IT -> IT, 과학/공학 -> 과학, 예체능/미술/음악 -> 예술,
광고/마케팅 -> 경영 등). 구조로 주는 값이라 LLM 없이 매핑한다.

### 매칭은 문자열 일치가 아니라 포함관계

공고 majors가 [] 이면 무관이라 통과. 아니면 프로필 major가 그 집합에 들어있는지로 판정한다. 지역도 같다.
지금까지의 버그는 원문에서 뽑은 값("이공계")과 프로필 값("IT")을 그대로 문자열 비교한 것이다. 위처럼 양쪽을
canonical로 통일하고 원문은 펼쳐서 저장하면, 포함관계 비교가 바르게 동작한다.

### "확인 필요"는 두 종류를 섞지 않는다

- 사용자가 조건을 안 골랐다: 그 조건은 계산에서 제외한다. 확인 필요가 아니다. (2일차 결정)
- 우리가 공고 원문을 못 읽었다(파싱 실패나 저신뢰, parse_status=needs_review): 이때만 확인 필요.

지금 프로토타입은 "사용자가 소득·학점을 안 골랐을 때"를 확인 필요로 처리하는데, 위 규칙대로 계산 제외로 바꿔야 한다.

### 나이

만 나이 조건(age_min, age_max)은 공모전에서 제일 흔한 게이트다. 매칭과 입력 둘 다 반드시 포함한다.
프로토타입에 지금 빠져 있어 추가 대상이다.

### 프로토타입 코드가 이 스펙에 맞출 것 (드리프트 정리)

- 필드명 통일: enrollment_status, income_max, gpa_min. (지금 코드는 enrollment, incomeMax, gpaMin)
- 전공 8개, 지역 13개로 교체. (지금 activities.js는 옛 전공 5개, 지역 5개)
- 나이 매칭과 입력 추가.
- "안 고름은 계산 제외"로 확인 필요 로직 수정.

이 정리는 프로토타입 수준으로만 맞춘다. 서버와 DB에서 도는 매칭은 개발 주차에 한다.

---

## 부록 1. DB 테이블 구성 (컬럼명·타입, PostgreSQL)

### profiles - 내 조건
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| age | int null | 만 나이 |
| grade | int null | 1~4 |
| semester | int null | 학기 |
| enrollment_status | text null | 재학 / 휴학 / 졸업예정 |
| major | text null | 전공 계열 |
| university | text null | 소속 대학 |
| university_region | text null | 대학 소재 지역 |
| residence_region | text null | 거주 지역 |
| nationality | text null | 국적 |
| income_bracket | int null | 소득분위 1~10 (잘 모름이면 null) |
| gpa | numeric(3,2) null | 직전 학기 학점 (잘 모름이면 null) |
| updated_at | timestamptz | |

### sources - 수집 소스
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | serial PK | |
| name | text | 예: 온통청년 |
| base_url | text | |
| adapter_key | text | 수집기 식별자 |
| active | boolean | |

### raw_postings - 수집 원문
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| source_id | int FK→sources | |
| source_url | text unique | 중복 방지 키 |
| raw_title | text | |
| raw_text | text | 정제된 본문 텍스트 |
| raw_html | text null | 원본 html |
| scraped_at | timestamptz | |
| status | text | raw / parsing / done / failed |

### postings - 완성본(유저가 조회)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| raw_posting_id | uuid FK→raw_postings | |
| track | text | activity / scholarship |
| category | text | 대외활동 / 공모전 / 봉사 / 장학 등 |
| title | text | |
| org | text null | 주최 |
| deadline | date null | 못 읽으면 null → 확인 필요 |
| url | text | 원문 링크 |
| eligibility | jsonb | 부록 3의 구조 |
| schema_version | int | 조건 틀 버전 |
| parse_status | text | curated / needs_review / failed |
| created_at | timestamptz | |

### parse_logs - 파싱 기록
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| raw_posting_id | uuid FK | |
| model | text | 사용 모델 |
| confidence | numeric null | 0~1 |
| error | text null | 실패 사유 |
| created_at | timestamptz | |

---

## 부록 2. 스크래퍼 원본 데이터 포맷 예시

수집기 fetch()가 돌려주는 한 건. 이 상태로 raw_postings에 적재한다.

```json
{
  "source_url": "https://linkareer.com/activity/123456",
  "raw_title": "2026 OO 대학생 서포터즈 12기 모집",
  "raw_text": "모집대상: 전국 4년제 대학 재학생 및 휴학생. 학년 무관. 소득 8분위 이하 우대. 지원마감: 2026-08-05",
  "raw_html": "<div class='view'>...</div>",
  "scraped_at": "2026-07-07T03:01:00+09:00"
}
```

주의: raw_text는 자유 문장이라 조건이 문장 속에 섞여 있다. 구조화는 부록 3의 LLM이 담당한다.

---

## 부록 3. LLM 프롬프트 + 강제 JSON 구조

### 1단계 Classifier - 공고 종류 분류

프롬프트
```
다음 공고를 분류해라. track은 자격 요건의 성격으로 정한다.
- track: activity(대외활동·공모전·봉사) 또는 scholarship(장학·지원금)
- category: 대외활동 / 공모전 / 봉사 / 장학 중 하나
공고: """{raw_title}\n{raw_text}"""
```

강제 JSON 구조
```json
{
  "type": "object",
  "properties": {
    "track": { "type": "string", "enum": ["activity", "scholarship"] },
    "category": { "type": "string", "enum": ["대외활동", "공모전", "봉사", "장학"] }
  },
  "required": ["track", "category"],
  "additionalProperties": false
}
```

### 2단계 Extractor - 조건 추출

프롬프트
```
너는 공고 자격요건 추출기다. 아래 공고에서 지원에 '필수'인 조건만 뽑아라.
- 우대·우선 조건은 무시한다.
- 원문에 없는 조건은 추측하지 말고 빈 배열이나 null로 둔다.
- 각 필드마다 근거가 된 원문 문장을 found_in_text에 그대로 담는다.
- 확신이 낮으면 confidence를 0.5 이하로 준다.
공고: """{raw_text}"""
```

강제 JSON 구조 - track A(activity)
```json
{
  "type": "object",
  "properties": {
    "grades": { "type": "array", "items": { "type": "integer", "enum": [1,2,3,4] } },
    "enrollment_status": { "type": "array", "items": { "type": "string", "enum": ["재학","휴학","졸업예정"] } },
    "majors": { "type": "array", "items": { "type": "string" } },
    "regions": { "type": "array", "items": { "type": "string" } },
    "age_min": { "type": ["integer", "null"] },
    "age_max": { "type": ["integer", "null"] },
    "found_in_text": { "type": "object" },
    "confidence": { "type": "number" }
  },
  "required": ["grades","enrollment_status","majors","regions","age_min","age_max","found_in_text","confidence"],
  "additionalProperties": false
}
```

강제 JSON 구조 - track B(scholarship)
```json
{
  "type": "object",
  "properties": {
    "grades": { "type": "array", "items": { "type": "integer", "enum": [1,2,3,4] } },
    "enrollment_status": { "type": "array", "items": { "type": "string" } },
    "income_max": { "type": ["integer", "null"] },
    "gpa_min": { "type": ["number", "null"] },
    "special": { "type": "array", "items": { "type": "string" } },
    "found_in_text": { "type": "object" },
    "confidence": { "type": "number" }
  },
  "required": ["grades","enrollment_status","income_max","gpa_min","special","found_in_text","confidence"],
  "additionalProperties": false
}
```

빈 배열과 null은 "무관"으로 해석한다. confidence가 낮거나 형식이 깨지면 parse_status를 needs_review로 둔다.

---

## eligibility JSONB 저장 예시

track A
```json
{
  "grades": [],
  "enrollment_status": ["재학", "휴학"],
  "majors": [],
  "regions": [],
  "age_min": null,
  "age_max": null,
  "found_in_text": { "enrollment_status": "전국 4년제 대학 재학생 및 휴학생" },
  "confidence": 0.9
}
```

track B
```json
{
  "grades": [],
  "enrollment_status": ["재학"],
  "income_max": 8,
  "gpa_min": 3.5,
  "special": [],
  "found_in_text": { "income_max": "소득 8분위 이하", "gpa_min": "직전 학기 3.5 이상" },
  "confidence": 0.85
}
```
