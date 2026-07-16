# Briefy 데이터 모델

> 이 문서는 `shared/schemas.ts`(zod 스키마)와 `supabase/migrations/0001_init.sql`(실제 테이블 생성 SQL)에 이미 구현되어 있는 데이터 모델의 **설계 근거**를 정리한 문서다. 새 설계를 제안하는 게 아니라, 왜 이렇게 나눴는지·왜 이 컬럼이 필요한지를 화면/기능 기준으로 역산해서 설명한다. 이 문서가 SQL을 대체하지 않는다 — 실행 가능한 유일한 소스는 `supabase/migrations/0001_init.sql`이고, 이 문서는 그 옆에 두고 읽는 설명서다.

## 0. 개요

Briefy가 다루는 엔티티는 CLAUDE.md에 고정된 7개뿐이다 — 화면 작업 중에 "테이블이 하나 더 필요해 보인다"는 판단이 들어도 여기서 벗어나지 않고, 먼저 사람에게 확인한다.

| 테이블 | 역할 한 줄 |
| --- | --- |
| `schedules` | 시간이 정해진 일정/약속 |
| `tasks` | 마감일이 있는 과제 |
| `routines` | 반복되는 루틴의 "정의"(내용·반복 규칙) |
| `routine_logs` | 루틴의 "그날그날 완료 기록" |
| `meals` | 하루 식단 |
| `memos` | 마감 없는 메모, 파싱 실패 시 원문 보관처 |
| `reminders` | 일정/과제에 붙는 별도 알림 시각 |

**관계**:
```
routines (1) ──< (N) routine_logs      한 루틴 정의에 여러 날짜의 완료 기록이 붙는다
{schedules, tasks} (1) ──< (N) reminders   일정 또는 과제 하나에 리마인더가 붙는다 (다형성 참조)
```

**공통 규칙** (7개 테이블 전부 동일하게 적용):
- PK는 `id uuid primary key default gen_random_uuid()`.
- 모든 테이블은 `raw_input text not null`을 가진다 — 파싱이 무엇을 근거로 이 행을 만들었는지 원문을 절대 잃어버리지 않는다는 CLAUDE.md 원칙.
- 모든 테이블은 `created_at timestamptz not null default now()`를 가진다.
- 날짜/시간 값은 애플리케이션 레이어(zod)에서 `YYYY-MM-DD`/`HH:mm` 문자열(ISO 8601)로 다루고, 타임존은 Asia/Seoul로 고정한다. DB 컬럼 타입은 문자열이 아니라 `date`/`time`/`timestamptz` 네이티브 타입을 쓰는데, 이는 "이번 주 마감", "오늘 일정" 같은 날짜 범위 조회를 인덱스로 빠르게 처리하기 위해서다 — Supabase JS 클라이언트가 이 컬럼들을 문자열로 주고받으므로 애플리케이션 레이어와 자연스럽게 맞물린다.

---

## 1. `schedules` — 시간이 정해진 일정

**어디서 쓰이는가**: `src/components/briefing/ScheduleCard.tsx`(오늘의 일정 카드), 향후 `server/services/briefingService.ts`가 오늘 날짜로 필터링해서 내려줄 데이터.

| 컬럼 | 타입 | null | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | uuid | ✗ | `gen_random_uuid()` | PK |
| `title` | text | ✗ | — | "치과", "대외활동 모임" 같은 일정 제목 |
| `date` | date | ✗ | — | 일정 날짜 |
| `start_time` | time | ✗ | — | 시작 시각 |
| `end_time` | time | ✓ | — | 종료 시각. 사용자가 "오후 3시 치과"처럼 끝나는 시간 없이 말하는 경우가 많아 nullable |
| `raw_input` | text | ✗ | — | 원문 |
| `created_at` | timestamptz | ✗ | `now()` | 생성 시각 |

**PK/FK**: PK만 있음, 다른 테이블을 참조하지 않음.
**인덱스**: `idx_schedules_date on schedules (date)` — 브리핑 홈이 "오늘 날짜"로 매번 필터링하므로 날짜 범위 조회가 핵심 쿼리 패턴.

**왜 이렇게 설계했는가**: 일정은 가장 단순한 엔티티다 — "언제(date+start_time), 무엇을(title)"만 있으면 화면(ScheduleCard)이 요구하는 정보를 전부 채울 수 있다. `end_time`을 nullable로 둔 건 실제 사용자 발화("오후 3시 치과")가 종료 시각을 거의 언급하지 않기 때문 — 필수로 만들면 파싱이 임의의 값을 지어내야 하는 상황이 생긴다.

```sql
create table schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  start_time time not null,
  end_time time,
  raw_input text not null,
  created_at timestamptz not null default now()
);

create index idx_schedules_date on schedules (date);
```

---

## 2. `tasks` — 마감일이 있는 과제

**어디서 쓰이는가**: `src/components/briefing/DeadlineCard.tsx`/`DeadlineItem.tsx`(마감 임박 카드), `DdayBadge.tsx`(D-day 계산).

| 컬럼 | 타입 | null | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | uuid | ✗ | `gen_random_uuid()` | PK |
| `title` | text | ✗ | — | 과제 제목 |
| `deadline` | date | ✗ | — | 마감일 |
| `completed` | boolean | ✗ | `false` | 완료 여부 |
| `raw_input` | text | ✗ | — | 원문 |
| `created_at` | timestamptz | ✗ | `now()` | 생성 시각 |

**PK/FK**: PK만 있음.
**인덱스**: `idx_tasks_deadline on tasks (deadline)` — "이번 주 마감 뭐 있어?" 같은 조회와 마감 임박순 정렬이 전부 이 컬럼 기준.

**왜 이렇게 설계했는가**: `completed`를 별도 로그 테이블로 분리하지 않고 `tasks` 안에 컬럼으로 둔 이유는, 과제는 "완료했다/안 했다"가 한 번 뒤집히면 끝인 **1회성 상태**이기 때문이다(루틴처럼 "오늘은 했는데 내일은 다시 초기화"되는 반복 개념이 없다). 그래서 `routines`/`routine_logs`처럼 나눌 필요 없이 `tasks.completed` 하나로 충분하다 — 이게 5번 절(`routines` vs `routine_logs`)의 대조군이다.

```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  deadline date not null,
  completed boolean not null default false,
  raw_input text not null,
  created_at timestamptz not null default now()
);

create index idx_tasks_deadline on tasks (deadline);
```

---

## 3. `routines` — 루틴의 "정의"

**어디서 쓰이는가**: `src/components/briefing/RoutineCard.tsx`(오늘의 루틴 카드).

| 컬럼 | 타입 | null | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | uuid | ✗ | `gen_random_uuid()` | PK |
| `title` | text | ✗ | — | 루틴 이름 (예: "오늘의 루틴") |
| `content` | text | ✗ | — | 실제 내용 (예: "200 push-up, 500 squat") — plan.md가 강조하는 "시간이 아니라 내용을 보여준다"는 차별점의 근거 |
| `start_time` | time | ✓ | — | 루틴 시작 시각 (없을 수도 있음) |
| `end_time` | time | ✓ | — | 루틴 종료 시각 |
| `repeat_rule` | text | ✗ | — | 반복 규칙 자유 문자열: `"daily"` / `"2split"` / `"weekly:mon,wed,fri"` 등 |
| `raw_input` | text | ✗ | — | 원문 |
| `created_at` | timestamptz | ✗ | `now()` | 생성 시각 |

**PK/FK**: PK만 있음(자식 테이블 `routine_logs`가 이 테이블을 참조).
**인덱스**: 없음 — 루틴 개수가 사용자당 소수(2분할/러닝 등)라 전체 스캔으로 충분, 조회는 항상 "오늘의 루틴 카드" 하나뿐이라 날짜 범위 쿼리가 필요 없음.

**주목할 점**: 이 테이블엔 `completed` 필드가 **없다**. 왜인지는 다음 절에서.

```sql
create table routines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  start_time time,
  end_time time,
  repeat_rule text not null,
  raw_input text not null,
  created_at timestamptz not null default now()
);
```

---

## 4. `routine_logs` — 루틴의 "그날그날 완료 기록"

**어디서 쓰이는가**: `RoutineCard.tsx`의 체크 상태, `server/services/briefingService.ts`가 계산할 "오늘이 2분할 중 상체/하체 몇 번째 날인지" 로직(plan.md 3.2.3의 핵심 차별점).

| 컬럼 | 타입 | null | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | uuid | ✗ | `gen_random_uuid()` | PK |
| `routine_id` | uuid | ✗ | — | FK → `routines(id)` |
| `date` | date | ✗ | — | 완료한 날짜 |
| `completed` | boolean | ✗ | `false` | 완료 여부 |
| `raw_input` | text | ✗ | — | 원문 (예: "오늘 운동 다 함") |
| `created_at` | timestamptz | ✗ | `now()` | 생성 시각 |

**PK/FK**: `routine_id references routines(id) on delete cascade` — 루틴이 삭제되면 그 완료 기록도 함께 정리되는 게 자연스럽다(고아 로그가 남아있을 이유가 없음).
**제약**: `unique (routine_id, date)` — 같은 루틴을 같은 날 두 번 완료 처리해도 로그가 중복되지 않게 강제한다.
**인덱스**: 위 unique 제약이 `(routine_id, date)` 복합 인덱스를 자동 생성하므로 별도 인덱스 불필요.

### 왜 `routines`와 분리했는가 (정규화 판단)

**"루틴의 정의"와 "매일의 완료 기록"은 갱신 빈도와 소유 주체가 다르다.** 정의(제목·내용·반복 규칙)는 사용자가 "매일 운동 루틴 상체 day"라고 말했을 때 딱 한 번 만들어지고 거의 안 바뀐다. 반면 완료 기록은 **매일** 새로 생긴다 — 하나의 루틴 정의에 날짜별로 여러 개의 완료 기록이 붙는 **1:N 관계**다.

만약 이 둘을 하나의 `routines` 테이블에 합쳤다면(예: `routines.completed_dates`를 배열 컬럼으로 두거나, 매일 새 row를 만들 때마다 `title`/`content`/`repeat_rule`까지 통째로 복제), 다음 문제가 생긴다:
- 루틴 내용을 수정("상체 day 운동 종목 변경")할 때 지난 완료 기록 전부를 찾아 똑같이 고쳐야 하는 **갱신 이상(update anomaly)** 이 생긴다.
- "오늘이 상체/하체 몇 번째 날인가"를 계산하려면 완료 기록만 날짜순으로 조회하면 되는데, 정의와 뒤섞여 있으면 매번 불필요한 컬럼까지 다 읽어야 한다.

`tasks.completed`(2번 절)와 비교하면 이 차이가 더 명확하다 — 과제는 완료 여부가 한 번 뒤집히면 끝나는 상태라 테이블을 나눌 이유가 없지만, 루틴은 "완료"라는 사건이 매일 반복해서 쌓이는 이력(history)이라 별도 테이블이 필요하다.

```sql
create table routine_logs (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines (id) on delete cascade,
  date date not null,
  completed boolean not null default false,
  raw_input text not null,
  created_at timestamptz not null default now(),
  unique (routine_id, date)
);
```

---

## 5. `meals` — 하루 식단

**어디서 쓰이는가**: `src/components/briefing/MealCard.tsx`.

| 컬럼 | 타입 | null | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | uuid | ✗ | `gen_random_uuid()` | PK |
| `date` | date | ✗ | — | 식단 날짜 |
| `breakfast` | text | ✓ | — | 아침 |
| `lunch` | text | ✓ | — | 점심 |
| `dinner` | text | ✓ | — | 저녁 |
| `raw_input` | text | ✗ | — | 원문 |
| `created_at` | timestamptz | ✗ | `now()` | 생성 시각 |

**PK/FK**: PK만 있음.
**인덱스**: `idx_meals_date on meals (date)` — "오늘 식단" 조회가 핵심 패턴.

**왜 이렇게 설계했는가**: 아침/점심/저녁을 각각 별도 테이블(예: `meal_breakfast`, `meal_lunch`)로 쪼개지 않고 한 row에 세 컬럼으로 묶었다 — 세 끼는 항상 "하루" 단위로 함께 조회되고(화면도 하루치를 한 카드에 표시), 사용자가 "오늘 식단 아침 그릭요거트 바나나 점심 잡곡밥..."처럼 한 문장에 세 끼를 같이 말하는 경우가 많아 파싱 결과도 자연스럽게 한 덩어리로 나온다. 굳이 쪼개면 조회할 때마다 3번 join해야 하는 비용만 생기고 얻는 이득이 없다. 각 끼니를 nullable로 둔 건 "점심만 기록"하는 경우를 허용하기 위해서.

```sql
create table meals (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  breakfast text,
  lunch text,
  dinner text,
  raw_input text not null,
  created_at timestamptz not null default now()
);

create index idx_meals_date on meals (date);
```

---

## 6. `memos` — 마감 없는 메모 / 파싱 실패 원문 보관처

**어디서 쓰이는가**: `src/components/briefing/MemoCard.tsx`, `server/services/parseService.ts`(파싱 실패 시 원문을 여기에 저장 — plan.md 3.1.5).

| 컬럼 | 타입 | null | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | uuid | ✗ | `gen_random_uuid()` | PK |
| `content` | text | ✗ | — | 메모 내용 |
| `raw_input` | text | ✗ | — | 원문 |
| `created_at` | timestamptz | ✗ | `now()` | 생성 시각 |

**PK/FK**: PK만 있음.
**인덱스**: 없음 — 날짜 범위 조회가 필요 없고(브리핑엔 "메모 전체"가 표시됨), 마감이라는 개념 자체가 없는 엔티티이기 때문.

**왜 이렇게 설계했는가**: 가장 단순한 테이블 — 마감도, 시간도, 완료 상태도 없다. 그래서 컬럼이 `content`/`raw_input`/`created_at` 셋뿐이다. 이 단순함 자체가 "파싱이 실패했을 때 안전하게 떨어질 수 있는 착지 지점"으로 이 테이블이 선택된 이유이기도 하다 — 어떤 파싱 결과든 최소한 `content`(원문 그대로)만 있으면 저장이 가능하므로, 다른 6개 테이블과 달리 "필수 구조화 필드"가 없다.

```sql
create table memos (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  raw_input text not null,
  created_at timestamptz not null default now()
);
```

---

## 7. `reminders` — 일정/과제에 붙는 별도 알림

**어디서 쓰이는가**: 현재 화면엔 아직 노출되지 않음(Phase 2 푸시 알림에서 실제로 발송 로직에 쓰일 예정). plan.md 3.1.4의 "다음주 화요일 오후 3시 팀플 회의, 전날 알려줘" 시나리오가 이 테이블을 생성하는 대표 사례.

| 컬럼 | 타입 | null | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | uuid | ✗ | `gen_random_uuid()` | PK |
| `target_type` | text | ✗ | — | `'schedule'` \| `'task'` (`check` 제약으로 값 강제) |
| `target_id` | uuid | ✗ | — | `target_type`에 따라 `schedules.id` 또는 `tasks.id`를 가리킴 |
| `remind_at` | timestamptz | ✗ | — | 알림 시각 |
| `raw_input` | text | ✗ | — | 원문 |
| `created_at` | timestamptz | ✗ | `now()` | 생성 시각 |

**PK/FK**: `target_id`에는 **FK가 없다** — 아래 설명.
**인덱스**: `idx_reminders_remind_at on reminders (remind_at)`(Phase 2 알림 스케줄러가 "지금 시각 이전인 것"을 조회할 때 사용), `idx_reminders_target on reminders (target_type, target_id)`(특정 일정/과제에 달린 리마인더를 역으로 찾을 때 사용).

### 왜 `schedules`/`tasks`에 컬럼으로 안 넣고 별도 테이블로 뺐는가 (정규화 판단)

리마인더는 일정에도, 과제에도 붙을 수 있는 **다형성(polymorphic) 대상**이다. 만약 `schedules`와 `tasks` 각각에 `remind_at` 컬럼을 추가하는 방식을 택했다면:
- 두 테이블에 똑같은 개념(알림 시각)의 컬럼이 중복 정의된다.
- 나중에 "루틴에도 알림을 달고 싶다"는 요구가 생기면 `routines`에도 같은 컬럼을 또 추가해야 한다 — 대상 종류가 늘어날 때마다 스키마가 계속 옆으로 퍼진다.

그래서 "알림"이라는 개념 자체를 독립 엔티티로 빼고, `target_type`+`target_id`로 "무엇에 붙은 알림인지"만 가리키는 방식을 택했다.

**트레이드오프**: `target_id`는 `target_type` 값에 따라 서로 다른 테이블(`schedules` 또는 `tasks`)을 가리켜야 하는데, PostgreSQL은 "이 값이 A일 땐 테이블 X를, B일 땐 테이블 Y를 참조하라"는 조건부 FK를 지원하지 않는다. 그래서 이번 설계에서는 `target_id`에 FK 제약을 걸지 않고 `uuid` 컬럼으로만 두었다 — 참조 무결성(가리키는 대상이 실제로 존재하는지)은 DB가 아니라 애플리케이션 레이어(`server/services/itemsService.ts`)에서 보장하기로 했다. 이건 편의를 위한 의도적 트레이드오프이지 실수가 아니다.

```sql
create table reminders (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('schedule', 'task')),
  target_id uuid not null,
  remind_at timestamptz not null,
  raw_input text not null,
  created_at timestamptz not null default now()
);

create index idx_reminders_remind_at on reminders (remind_at);
create index idx_reminders_target on reminders (target_type, target_id);
```

---

## 8. mock 데이터 대조 검증

`src/mocks/briefing.ts`, `src/mocks/responses.ts`에 있는 mock 인스턴스를 위 테이블 설계와 필드 단위로 대조한 결과.

| 엔티티 | mock 파일 | mock 필드 | 테이블 컬럼과 대조 |
| --- | --- | --- | --- |
| Schedule | `mocks/briefing.ts` (2건: 치과, 대외활동 모임) | `id,title,date,startTime,rawInput,createdAt` (`endTime` 없음 — optional이라 정상) | **일치** — 누락/초과 필드 없음 |
| Task | `mocks/briefing.ts`(3건) + `mocks/responses.ts`(2건 추가) | `id,title,deadline,completed,rawInput,createdAt` | **일치** |
| Routine | `mocks/briefing.ts`(1건) + `mocks/responses.ts`(2건, complete/update 시나리오용) | `id,title,content,startTime,endTime,repeatRule,rawInput,createdAt` | **일치** |
| Meal | `mocks/briefing.ts`(1건) | `id,date,breakfast,lunch,dinner,rawInput,createdAt` | **일치** |
| Memo | `mocks/briefing.ts`(1건) | `id,content,rawInput,createdAt` | **일치** |
| RoutineLog | 없음 | — | **테이블 설계는 있으나 mock 인스턴스 없음.** 자연어 파이프라인이 아직 "오늘 운동 다 함" 같은 `complete` intent를 실제로 `routine_logs` insert까지 이어본 적이 없어서다(현재는 `routines` 자체를 가리키는 mock만 존재). 불일치가 아니라 커버리지 공백 — 다음 mock/서버 작업에서 채워야 할 항목. |
| Reminder | 없음 | — | **동일하게 mock 인스턴스 없음.** plan.md 3.1.4의 "전날 알려줘" 시나리오가 이 테이블을 실제로 생성하는 예시인데 아직 mock으로 만들어진 적이 없음. 위와 동일하게 커버리지 공백으로 기록. |

**결론**: 실제로 mock 인스턴스가 존재하는 5개 엔티티(schedules/tasks/routines/meals/memos)는 스키마·테이블과 필드 단위로 전부 일치하며 불일치 없음. 나머지 2개(routine_logs/reminders)는 설계는 끝났지만 아직 mock으로 한 번도 만들어보지 않은 상태 — 버그는 아니지만 "실제로 이 모양의 데이터가 화면까지 잘 흘러가는지"는 아직 검증된 적이 없다는 뜻이므로, mock 흐름 작업이나 서버 연동 시 우선적으로 확인이 필요하다.

---

## 9. 참고

- 이 문서, `shared/schemas.ts`, `supabase/migrations/0001_init.sql` 셋은 같은 설계를 서로 다른 층위에서 표현한다: **zod 스키마**는 애플리케이션(FE/BE)이 다루는 타입, **SQL**은 실제로 실행되는 유일한 테이블 생성 경로(대시보드 수동 생성 금지, CLAUDE.md), **이 문서**는 그 둘의 "왜"를 설명하는 자연어 설명서. 셋 중 하나를 바꾸면 나머지 둘도 함께 갱신해야 한다.
- 스키마 자체를 바꿔야 할 필요가 생기면(예: A-2/A-3에서 조회·대상선택 응답 스키마 확장) 새 마이그레이션 파일(`0002_*.sql`)을 추가하고 이 문서에도 해당 절을 갱신한다 — `0001_init.sql`을 직접 고치지 않는다.
