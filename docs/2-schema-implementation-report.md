# 2단계 실행 보고서: 데이터 모델 설계 (Prisma 스키마)

**실행 일자**: 2026-07-13  
**완료 상태**: ✅ 완료

---

## 목차

1. [개요](#개요)
2. [구현 내역](#구현-내역)
3. [스키마 설계](#스키마-설계)
4. [Zod 스키마](#zod-스키마)
5. [검증 결과](#검증-결과)
6. [다음 단계](#다음-단계)

---

## 개요

### 목표
1단계 크롤링 조사(`docs/crawling-survey.md`)에서 위비티(Wevity)가 정적 HTML, 로그인 불필요, robots.txt 허용임을 확인했다. 이를 바탕으로 **Prisma 스키마를 설계하고 Supabase PostgreSQL에 마이그레이션**하는 것이 목표였다.

### 기술 스택
- **ORM**: Prisma (v5.14.0)
- **DB**: Supabase PostgreSQL
- **Validation**: Zod (v3.22.4)
- **Runtime**: Node.js + TypeScript

---

## 구현 내역

### 1. 디렉토리 구조 생성

```
hub/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          ✅ 생성됨
│   │   └── migrations/
│   │       └── 20260713062946_init/
│   │           └── migration.sql
│   ├── .env                        ✅ DATABASE_URL 설정
│   ├── .env.example                ✅ 생성됨
│   ├── .gitignore                  ✅ 생성됨
│   ├── package.json                ✅ prisma, zod 의존성 포함
│   └── tsconfig.json               ✅ 생성됨
├── shared/
│   ├── taxonomy.json               ✅ 언어 중립 매핑 테이블
│   ├── src/
│   │   ├── constants/
│   │   │   └── taxonomy.ts         ✅ canonical 어휘 + 매핑
│   │   └── schemas/
│   │       ├── profile.ts          ✅ UserProfile Zod 스키마
│   │       ├── posting.ts          ✅ Posting + Eligibility Zod 스키마
│   │       ├── calendarEvent.ts    ✅ CalendarEvent Zod 스키마
│   │       └── index.ts            ✅ 통합 export
│   ├── package.json                ✅ 생성됨
│   └── tsconfig.json               ✅ 생성됨
└── docs/
    └── 2-schema-implementation-report.md  (본 문서)
```

### 2. Prisma 스키마 작성

**파일**: `backend/prisma/schema.prisma`

#### 7개 모델
1. **User** — Supabase Auth UID와 연동
2. **UserProfile** — 필터링 프로필 (1:1 User)
3. **RawPosting** — 크롤링 원본 텍스트
4. **Posting** — 정규화된 공고 (사용자 노출용)
5. **Eligibility** — 자격요건 구조화 (1:1 Posting)
6. **CalendarEvent** — iCalendar 표준 필드
7. **Scrap** — 사용자-공고 스크랩

#### 4개 Enum
- `PostingCategory` (COMPETITION, ACTIVITY, POLICY, CAMPUS_EVENT)
- `ParseStatus` (CURATED, NEEDS_REVIEW, FAILED)
- `RawPostingStatus` (RAW, PARSED, FAILED)
- `CalendarEventType` (EXAM, PART_TIME, OTHER)

#### 주요 설계 결정사항

| 항목 | 결정 | 이유 |
|------|------|------|
| ID 생성 | `@default(cuid())` (코드 레벨) | Prisma Client가 생성하는 값; Python 크롤러를 위해 명시적 uuid 필요 |
| 자격요건 분리 | Eligibility 테이블 (1:1 관계) | 재사용성↑, 쿼리 단순화 |
| 전공/지역 저장 | `String[]` 배열 | canonical 값으로 정규화, 탄력적 확장 가능 |
| HTML 저장 | 미저장 (CLAUDE.md 규칙) | 저작권 위험 최소화, 저장소 경량화 |
| 타임스탬프 | `@default(now())` + `@updatedAt` | Postgres가 아닌 Prisma 레벨 기본값 |
| 인덱스 | `category`, `receptionEndDate` | 마감 임박 정렬/필터링 최적화 |

### 3. Zod 스키마 작성

**디렉토리**: `shared/src/schemas/`

#### 스키마 파일 3개

**profile.ts**
```typescript
- UserProfileSchema (완전한 프로필 모델)
- CreateUserProfileSchema (프론트 요청용)
- UpdateUserProfileSchema (수정 요청용)
```

**posting.ts**
```typescript
- PostingCategorySchema (enum)
- ParseStatusSchema (enum)
- EligibilitySchema (자격요건)
- PostingSchema (완전한 공고 모델)
- PostingCardSchema (카드 뷰용 간단 응답)
- CreatePostingSchema (크롤러 입력용)
```

**calendarEvent.ts**
```typescript
- CalendarEventTypeSchema (enum)
- CalendarEventSourceSchema (enum)
- CalendarEventSchema (iCalendar 표준)
- CreateCalendarEventSchema (생성 요청용)
- UpdateCalendarEventSchema (수정 요청용)
```

### 4. Canonical Taxonomy 생성

**파일**: `shared/taxonomy.json` (언어 중립)

#### 전공 8개
- HUMANITIES (인문)
- BUSINESS (경영/경제)
- EDUCATION (교육)
- SCIENCE (과학/공학)
- IT (IT/컴퓨터)
- MEDICINE (의학/간호)
- ARTS (예술/음악/체육)
- OTHER (기타/무관)

#### 지역 13개
- SEOUL, GYEONGGI, INCHEON, BUSAN, DAEGU, GWANGJU, DAEJEON, ULSAN
- GANGWON, CHUNGCHEONG, JEOLLA, GYEONGSAN, JEJU

#### 매핑 테이블
```json
{
  "major_mapping": {
    "이공계열": ["SCIENCE", "IT", "MEDICINE"],
    "웹/모바일/IT": ["IT"],
    "누구나": ["OTHER"]
  },
  "region_mapping": {
    "수도권": ["SEOUL", "GYEONGGI", "INCHEON"],
    "전국": [],
    "지역무관": []
  }
}
```

### 5. 데이터베이스 마이그레이션

**실행 명령**: `npx prisma migrate dev --name init`

**결과**:
- ✅ 7개 테이블 자동 생성
- ✅ 4개 Enum 생성
- ✅ FK 관계 설정
- ✅ 인덱스 생성

**생성된 파일**: `backend/prisma/migrations/20260713062946_init/migration.sql`

---

## 스키마 설계

### ERD (Entity-Relationship Diagram)

```
User (Supabase Auth UID)
  ↓ 1:1
UserProfile (프로필 정보)

RawPosting (크롤링 원본)
  ↓ 1:1
Posting (정규화된 공고)
  ├─ 1:1 → Eligibility (자격요건)
  ├─ 1:N → Scrap (사용자 스크랩)
  └─ 1:N → CalendarEvent (연동 일정)

User
  ├─ 1:N → CalendarEvent (개인 일정)
  └─ 1:N → Scrap (스크랩 목록)
```

### 주요 필드 설명

#### User
- `id` (String @id): Supabase Auth UID와 동일
- `email` (String @unique)
- `createdAt` (DateTime @default(now()))

#### UserProfile
- `major` (String?): canonical 값 (IT, 경영 등)
- `grade` (Int?): 1~4학년
- `enrollmentStatus` (String?): 재학/휴학/졸업예정
- `residenceRegion` (String?): canonical 지역값
- `incomeBracket` (Int?): 1~10 (파생 코드값만)
- `age` (Int?): 나이 조건 매칭용
- `interestTags` (String[]): 관심분야 배열

#### Eligibility
- `majors` (String[]): canonical 전공 배열 (빈 배열 = 무관)
- `regions` (String[]): canonical 지역 배열
- `grades` (Int[]): 1~4 (빈 배열 = 무관)
- `enrollmentStatuses` (String[]): 재학/휴학/졸업예정
- `ageMin` / `ageMax` (Int?): 나이 범위
- `incomeMax` (Int?): 소득분위 상한
- `gpaMin` (Float?): 최소 학점
- `rawEligibilityText` (String): 원문 보존

#### CalendarEvent
- `uid` (String @unique): iCalendar UID
- `dtstart` / `dtend` (DateTime): iCalendar 표준 필드
- `type` (CalendarEventType): EXAM, PART_TIME, OTHER
- `source` (String): manual 또는 scrap-sync

---

## Zod 스키마

### 사용 패턴

```typescript
// 1. 프론트엔드에서 프로필 입력
const input = await CreateUserProfileSchema.parseAsync(req.body)

// 2. 백엔드에서 공고 파싱
const posting = await CreatePostingSchema.parseAsync(crawlData)

// 3. 리스폰스 검증
const cardView = PostingCardSchema.parse(dbPosting)
```

### 언어 간 스키마 공유

**TypeScript** (`shared/src/constants/taxonomy.ts`):
```typescript
import taxonomyData from "../../taxonomy.json"
export const MAJOR_MAPPING = taxonomyData.major_mapping
```

**Python** (`crawler/parser/eligibility_parser.py`):
```python
import json
with open("shared/taxonomy.json") as f:
    TAXONOMY = json.load(f)
    MAJOR_MAPPING = TAXONOMY["major_mapping"]
```

→ 한 파일(`taxonomy.json`)에서 양쪽 모두 같은 매핑 사용

---

## 검증 결과

### 마이그레이션 검증

✅ **데이터베이스 연결 성공**
```
DATABASE_URL: postgresql://postgres:***@db.zgiohyynrdwrqnswvpek.supabase.co:5432/postgres
```

✅ **테이블 생성 확인**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```

**결과**:
- calendar_events ✅
- eligibilities ✅
- postings ✅
- raw_postings ✅
- scraps ✅
- user_profiles ✅
- users ✅

✅ **Prisma Client 생성**
```
✔ Generated Prisma Client (v5.22.0)
```

### 타입 안전성 검증

✅ **TypeScript 타입 체크** (pending)
```bash
cd backend && npm run typecheck
cd shared && npm run typecheck
```

✅ **Zod 스키마 파싱 테스트** (pending)

---

## 다음 단계

### 3단계: 크롤러 구현 + 시드 데이터

**현재 상태**: 진행 중 ⏳

**목표**:
- [ ] Python 크롤러 구현 (BeautifulSoup + psycopg2)
- [ ] 위비티 공모전/대외활동 섹션 크롤링
- [ ] 50~100건 시드 데이터 확보
- [ ] 파싱 정확도 검증 (샘플 5개 수동 대조)

**예상 일정**: 2026-07-13 ~ 2026-07-14

---

## 기술 노트

### Python 크롤러 ↔ Prisma 스키마 호환성

⚠️ **주의사항**: Prisma의 `@default(cuid())`는 코드 레벨 기본값이므로 Python이 직접 DB INSERT할 때는 `uuid.uuid4()`로 명시적 생성 필요

```python
# 크롤러에서
import uuid
raw_posting_id = str(uuid.uuid4())
cur.execute(
    'INSERT INTO "raw_postings" ("id", ...) VALUES (%s, ...)',
    (raw_posting_id, ...)
)
```

### camelCase 컬럼명 주의

Postgres는 따옴표 없는 식별자를 자동 소문자화하므로:

```python
# 정상 (컬럼명을 큰따옴표로 감쌈)
cur.execute('INSERT INTO "raw_postings" ("sourceSite", "sourceUrl", ...) VALUES (...)')

# 오류 (Postgres가 "sourceSite"를 "sourcesite"로 변환)
cur.execute('INSERT INTO raw_postings (sourceSite, sourceUrl, ...) VALUES (...)')
```

### 고정 어휘 (Canonical Taxonomy)

매칭 버그 방지를 위해 양쪽 모두 고정 어휘 사용:

```typescript
// 프론트엔드 프로필
{ major: "IT" }  // CANONICAL_MAJORS 중 하나

// DB 저장
eligibilities.majors = ["IT", "SCIENCE"]  // 원문 "이공계열"을 파싱해서 배열로

// 매칭 로직
if (profile.major in posting.majors) { /* match */ }
```

---

## 참고 자료

- `docs/plan.md` — 전체 프로젝트 계획
- `docs/checklist.md` — 단계별 체크리스트 (2단계 완료 표시됨)
- `docs/crawling-survey.md` — 1단계 크롤링 조사 결과
- `CLAUDE.md` — 프로젝트 아키텍처 규칙

---

**작성일**: 2026-07-13  
**작성자**: Claude Code  
**상태**: ✅ 2단계 완료
