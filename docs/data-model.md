# ConGraduation 데이터 모델 설계 (Week2, T-01)

기준: ConGraduation_Task.md Week2 항목 + gsw_curriculum_raw.csv 실제 컬럼 구조
목표: 내일 Supabase에 아래 SQL 그대로 실행해서 테이블 생성

---

## 테이블 개요 (4개)

| 테이블 | 역할 | 소유 |
|---|---|---|
| `profiles` | 사용자 프로필 (학번/전공/입학년도) | 사용자별 |
| `graduation_requirements` | 졸업요건 (총 학점, 전공/교양 학점, 이진요건 필요 여부) | 사용자별 |
| `completed_courses` | 사용자가 실제로 들은 과목 (과목별 기록) | 사용자별 |
| `course_catalog` | 학과 개설 과목 목록 (CSV에서 시딩, 검색/추천용 원본 데이터) | 공용 (모든 사용자 공유) |

`course_catalog`만  "공용" 테이블 — 개설 과목 목록은 모든 학생이 같은 걸 보기 때문. 나머지 3개는 사용자마다 따로 가지는 데이터라 전부 `user_id`로 연결.

---

## 1. profiles (사용자 프로필)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | `uuid` (PK, FK → `auth.users.id`) | Supabase Auth 사용자 ID 그대로 사용 |
| `student_id` | `text` | 학번 |
| `major` | `text` | 전공 (MVP는 "컴퓨터학부 글로벌소프트웨어융합전공" 고정값) |
| `admission_year` | `smallint` | 입학년도 |
| `created_at` | `timestamptz` | 생성 시각 (기본값: now()) |

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_id text,
  major text default '컴퓨터학부 글로벌소프트웨어융합전공',
  admission_year smallint,
  created_at timestamptz default now()
);
```

---

## 2. graduation_requirements (졸업요건)

어제 모달에서 입력받은 값(`totalDraft`, `majorDraft`, `generalDraft`) + 뱃지에 필요한 이진 요건 플래그.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | `uuid` (PK) | |
| `user_id` | `uuid` (FK → `profiles.id`) | |
| `total_credits` | `smallint` | 총 졸업학점 (예: 130) |
| `major_credits` | `smallint` | 전공 학점 (예: 51) |
| `general_credits` | `smallint` | 교양 학점 (예: 30) |
| `dual_major_required` | `boolean` | 다중전공 요건 해당 여부 |
| `fieldwork_required` | `boolean` | 현장실습 요건 해당 여부 |
| `overseas_credit_required` | `boolean` | 해외학점 요건 해당 여부 |
| `startup_required` | `boolean` | 창업교과목 요건 해당 여부 |
| `capstone_required` | `boolean` | 종합설계 요건 해당 여부 |
| `updated_at` | `timestamptz` | 마지막 수정 시각 |

```sql
create table graduation_requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  total_credits smallint not null,
  major_credits smallint not null,
  general_credits smallint not null,
  dual_major_required boolean default false,
  fieldwork_required boolean default false,
  overseas_credit_required boolean default false,
  startup_required boolean default false,
  capstone_required boolean default false,
  updated_at timestamptz default now()
);
```

---

## 3. completed_courses (이수 과목 기록)

Task.md 정의 그대로: 과목명 / 학점 / 이수구분 / 학기 / 성적. 계산 엔진(T-02)이 이 테이블을 집계해서 대시보드 진행률·뱃지를 계산함.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | `uuid` (PK) | |
| `user_id` | `uuid` (FK → `profiles.id`) | |
| `course_name` | `text` | 과목명 (예: "자바프로그래밍") |
| `credits` | `smallint` | 학점 |
| `category` | `text` | 이수구분 — `전공필수` / `전공선택` / `교양필수` / `교양선택` / `창업교과목` / `현장실습` / `해외학점` / `종합설계` 중 하나 |
| `semester` | `text` | 이수 학기 (예: "2024-1") |
| `grade` | `text` | 성적 (예: "A+", null 허용 — 수강 중일 수 있음) |
| `created_at` | `timestamptz` | |

```sql
create table completed_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  course_name text not null,
  credits smallint not null,
  category text check (category in (
    '전공필수', '전공선택', '교양필수', '교양선택',
    '창업교과목', '현장실습', '해외학점', '종합설계'
  )),
  semester text,
  grade text,
  created_at timestamptz default now()
);
```

**참고**: `category`는 `check` 제약으로 오타 방지. 값 종류가 이미 gsw_curriculum_raw.csv에서 확인한 `전공`/`교양` 구분 + 이진요건 카테고리를 합친 거라, 나중에 실제로 더 세분화가 필요하면 이 목록만 수정하면 됨.

---

## 4. course_catalog (개설 과목 목록 — CSV 시딩용)

`gsw_curriculum_raw.csv` 컬럼 구조를 그대로 반영. Week3 T-05(과목 검색)에서 이 테이블을 검색 대상으로 씀. 지금은 테이블만 만들어두고, 실제 데이터 넣는(seed) 건 T-05 때 해도 됨.

| 컬럼 | 타입 | CSV 원본 컬럼 |
|---|---|---|
| `id` | `uuid` (PK) | — |
| `year` | `smallint` | 1번째 컬럼 (2021 등) |
| `school` | `text` | 2번째 (경북대학교) |
| `college` | `text` | 3번째 (IT대학) |
| `department` | `text` | 4번째 (컴퓨터학부 글로벌소프트웨어융합전공) |
| `course_name` | `text` | 5번째 (과목명) |
| `grade_level` | `smallint` | 6번째 (학년) |
| `semester` | `text` | 7번째 (1학기 등) |
| `credits` | `smallint` | 8번째 (학점) |
| `theory_hours` | `smallint` | 9번째 (이론시간) |
| `practice_hours` | `smallint` | 10번째 (실습시간) |
| `category` | `text` | 11번째 (교양/전공) |

```sql
create table course_catalog (
  id uuid primary key default gen_random_uuid(),
  year smallint,
  school text,
  college text,
  department text,
  course_name text not null,
  grade_level smallint,
  semester text,
  credits smallint,
  theory_hours smallint,
  practice_hours smallint,
  category text
);
```

---

## 테이블 관계 요약

```
auth.users (Supabase 기본 제공)
   │ 1:1
   ▼
profiles
   │ 1:1                1:N
   ├──────────► graduation_requirements
   └──────────► completed_courses

course_catalog  (독립 테이블, 사용자와 무관한 공용 참고 데이터)
```

---

## 오늘 mock state와의 대응 관계 (참고용)

| App.jsx의 state | 나중에 대응될 컬럼 |
|---|---|
| `totalDraft`, `majorDraft`, `generalDraft` | `graduation_requirements.total_credits/major_credits/general_credits` |
| `progTotalDraft`, `progMajorDraft`, `progGeneralDraft` | 임시: 현재는 합계값. 실제로는 `completed_courses`를 집계한 결과여야 함 (계산 엔진 T-02에서 처리) |
| `requirementRows`, `badges`, `gapList` (DashboardSection mock) | 계산 엔진이 `completed_courses` + `graduation_requirements`를 비교해서 만들어내는 결과값 |

---

## (3주차 참고용 초안) course_sections — 2026-2학기 실제 개설 시간표

학사공지로 올라온 `2026-2_curriculum.xlsx`를 열어보니, `course_catalog`(커리큘럼 설계도)와는 다른 데이터였음 — 이건 **이번 학기에 실제 열리는 분반별 시간표**. 전체 3,189행 중 컴퓨터학부 75행, 그중 글로벌소프트웨어융합전공 13행.

T-05(3주차, 과목 검색) 때 이 구조로 시작:

| 컬럼 | 타입 | 원본 컬럼 |
|---|---|---|
| `id` | `uuid` (PK) | — |
| `section_code` | `text` (unique) | 강좌번호 (예: `CAIB0211-001`) |
| `course_name` | `text` | 교과목명 |
| `credits` | `smallint` | 학점 |
| `theory_hours` | `smallint` | 이론 |
| `practice_hours` | `smallint` | 실습 |
| `grade_level` | `smallint` | 학년 |
| `category` | `text` | 교과구분 (전공/교양) |
| `schedule_text` | `text` | 시간 (예: "화 1A,1B,2A / 목 2B,3A,3B") — 요일·교시 파싱은 나중 과제 |
| `room` | `text` | 강의실 |
| `campus` | `text` | 캠퍼스구분 |
| `college` | `text` | 개설대학 |
| `department` | `text` | 개설학과 |
| `track` | `text` | 개설 전공및분반 (null 가능 — 학부 공통 과목도 있음) |
| `professor` | `text` | 교수명 |
| `semester` | `text` | 개설연도/학기 (예: "2026-2") |

```sql
create table course_sections (
  id uuid primary key default gen_random_uuid(),
  section_code text unique,
  course_name text not null,
  credits smallint,
  theory_hours smallint,
  practice_hours smallint,
  grade_level smallint,
  category text,
  schedule_text text,
  room text,
  campus text,
  college text,
  department text,
  track text,
  professor text,
  semester text
);
```

**참고**: `schedule_text`를 요일/교시 구조로 잘게 쪼개서 저장할지(`day`, `period` 컬럼 분리) 아니면 텍스트로 뭉쳐서 저장 후 화면에서만 파싱할지는 3주차에 결정. 지금은 원본 그대로 보존하는 쪽으로 설계.

---

## 내일(Supabase 작업) 순서

1. Supabase 프로젝트에서 위 4개 테이블 SQL을 순서대로 실행 (`profiles` → `graduation_requirements`/`completed_courses` → `course_catalog`)
2. Supabase Auth 연동 확인 (회원가입 시 `profiles` row 자동 생성 트리거는 나중 단계, 지금은 수동 insert로 테스트해도 됨)
3. `course_catalog`에 CSV 데이터 일부 seed (전체 30행 정도면 충분, INSERT문 또는 Supabase Table Editor의 CSV import 기능 사용 가능)
4. 각 테이블에 테스트용 row 1개씩 넣고 조회되는지 확인 → backlog.md T-01 DoD("테이블이 실제 DB에 생성되어 있다") 충족
