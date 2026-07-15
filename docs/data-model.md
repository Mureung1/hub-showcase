# 데이터 모델 설계 (T2-b 준비)

> 2주차 수요일 미션 "데이터 모델 설계" 산출물. 실제 Supabase 생성은 목요일(T2-b)에 이 스키마 그대로 실행한다.

## 왜 테이블이 하나뿐인가

이 서비스가 다루는 데이터는 두 종류다.

1. **공고 데이터** — 채용/인턴십/공모전/대외활동 목업. `backend/data/postings.json` 파일로 관리하고 Supabase에 넣지 않는다(T3, [CLAUDE.md](../CLAUDE.md) "백엔드 방향" 참고).
2. **사용자 입력(프로필)** — 정보 입력 화면(T4)에서 제출한 값. 2주차 미션의 CRUD 요구사항(화면 → 서버 → DB 저장 → 응답)을 충족시키는 대상이 바로 이 데이터다.

그래서 Supabase에는 `profiles` 테이블 하나만 둔다. 로그인/계정 개념이 없으므로 제출할 때마다 새 행이 하나씩 쌓이는 방식이다(사용자 식별자 없음).

## `profiles` 테이블

`src/screens/InfoInput.jsx`(T4)가 제출하는 9개 필드를 그대로 컬럼으로 옮긴다. JS 쪽은 camelCase, DB 컬럼은 Postgres 관례대로 snake_case를 쓴다.

| 컬럼 (DB, snake_case) | 폼 필드 (JS, camelCase) | 타입 | NULL 허용 | 비고 |
|---|---|---|---|---|
| `id` | — | `uuid` | NOT NULL | `default gen_random_uuid()`, PK |
| `university` | `university` | `text` | NOT NULL | 대학교 |
| `grade` | `grade` | `text` | NOT NULL | 학년 (`"1학년"` ~ `"졸업유예"`, 드롭다운 값 그대로 저장) |
| `major` | `major` | `text` | NOT NULL | 전공 |
| `double_major` | `doubleMajor` | `text` | NULL 허용 | 복수전공 (선택) |
| `minor` | `minor` | `text` | NULL 허용 | 부전공 (선택) |
| `earned_credits` | `earnedCredits` | `integer` | NOT NULL | 취득학점 |
| `gpa` | `gpa` | `numeric(3,2)` | NOT NULL | 평균평점 (4.5 만점 기준) |
| `certificates` | `certificates` | `text[]` | NULL 허용 | 자격증 목록 (선택, 빈 배열 가능) |
| `experience` | `experience` | `text` | NULL 허용 | 그 외 경험 (선택) |
| `created_at` | — | `timestamptz` | NOT NULL | `default now()` |

## 생성 SQL (내일 Supabase SQL Editor에 그대로 실행)

```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  university text not null,
  grade text not null,
  major text not null,
  double_major text,
  minor text,
  earned_credits integer not null,
  gpa numeric(3,2) not null,
  certificates text[],
  experience text,
  created_at timestamptz not null default now()
);
```

## 백엔드에서의 매핑 (T6 참고)

`POST /api/profiles`가 받는 요청 바디는 `InfoInput.jsx`가 보내는 camelCase 그대로다. Supabase insert 직전에 snake_case로 변환한다.

```js
const { university, grade, major, doubleMajor, minor, earnedCredits, gpa, certificates, experience } = req.body;

await supabase.from('profiles').insert({
  university,
  grade,
  major,
  double_major: doubleMajor ?? null,
  minor: minor ?? null,
  earned_credits: Number(earnedCredits),
  gpa: Number(gpa),
  certificates,
  experience: experience ?? null,
});
```

---
작성일: 2026-07-15
