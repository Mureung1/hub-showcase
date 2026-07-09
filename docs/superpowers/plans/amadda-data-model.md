# 아맞다 데이터 모델과 RLS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase Postgres에 사용자별 프로필, 카테고리, 인사이트, 인사이트-카테고리 연결 테이블과 RLS 정책을 만든다.

**Architecture:** 데이터 소유권은 모든 핵심 테이블의 `user_id`로 표현한다. 프론트엔드는 anon key만 사용하고, Supabase RLS가 사용자별 조회/생성/수정/삭제 권한을 강제한다.


**FSD note:** 파일 경로는 slice 내부 위치를 표기한다. 외부 import는 각 slice의 `index.ts` public API를 사용하며, 새 slice를 만들 때 필요한 `index.ts`도 함께 추가한다.

**Tech Stack:** Supabase Postgres, SQL Migration, TypeScript, Vitest

---

## 범위

포함 범위:

- `profiles`, `categories`, `insights`, `insight_categories`
- `categories.sort_order`
- 사용자별 카테고리 이름 중복 방지
- 사용자별 URL 중복 방지
- RLS 활성화와 `auth.uid()` 기반 정책
- 프론트엔드 타입 파일

제외 범위:

- Supabase 프로젝트 생성
- OAuth provider 콘솔 설정
- URL 메타데이터 수집 함수
- Storage bucket

## 파일 구조

- Create: `supabase/migrations/0001_init_amadda_schema.sql`
  - 테이블, 인덱스, 트리거, RLS 정책을 정의한다.
- Create: `src/shared/api/database.types.ts`
  - MVP에서 사용할 Supabase row/insert/update 타입을 정의한다.
- Create: `src/entities/category/model/category.ts`
  - 카테고리 이름 정규화와 기본 색상 선택 규칙을 둔다.
- Create: `src/entities/category/model/category.test.ts`
  - 카테고리 이름 중복 판단에 필요한 정규화 규칙을 검증한다.
- Create: `docs/supabase-setup.md`
  - Supabase SQL 적용 순서와 환경 변수 입력 위치를 기록한다.

---

### Task 1: 카테고리 도메인 규칙 작성

**Files:**

- Create: `src/entities/category/model/category.ts`
- Create: `src/entities/category/model/category.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/entities/category/model/category.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  CATEGORY_COLOR_PALETTE,
  getDefaultCategoryColor,
  normalizeCategoryName,
} from './category';

describe('category domain', () => {
  it('trims category names and lowercases for duplicate comparison', () => {
    expect(normalizeCategoryName('  UI/UX  ')).toBe('ui/ux');
  });

  it('keeps Korean category names while trimming whitespace', () => {
    expect(normalizeCategoryName('  디자인  ')).toBe('디자인');
  });

  it('returns deterministic colors from creation order', () => {
    expect(getDefaultCategoryColor(0)).toBe(CATEGORY_COLOR_PALETTE[0]);
    expect(getDefaultCategoryColor(CATEGORY_COLOR_PALETTE.length)).toBe(
      CATEGORY_COLOR_PALETTE[0]
    );
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/entities/category/model/category.test.ts
```

Expected:

```text
FAIL src/entities/category/model/category.test.ts
Cannot find module './category'
```

- [ ] **Step 3: 카테고리 도메인 구현**

Create `src/entities/category/model/category.ts`:

```ts
export const CATEGORY_COLOR_PALETTE = [
  '#1F7A4D',
  '#2F6FDB',
  '#D97706',
  '#C2410C',
  '#7C3AED',
  '#0F766E',
] as const;

export function normalizeCategoryName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export function getDefaultCategoryColor(index: number) {
  return CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length];
}
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
npm test -- src/entities/category/model/category.test.ts
```

Expected:

```text
3 passed
```

- [ ] **Step 5: 커밋**

Run:

```bash
git add src/entities/category/model/category.ts src/entities/category/model/category.test.ts
git commit -m "feat: 카테고리 도메인 규칙 추가"
```

---

### Task 2: Supabase 스키마 마이그레이션 작성

**Files:**

- Create: `supabase/migrations/0001_init_amadda_schema.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

Create `supabase/migrations/0001_init_amadda_schema.sql`:

```sql
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default '사용자',
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (length(btrim(name)) > 0)
);

create unique index if not exists categories_user_name_unique_idx
  on public.categories (user_id, lower(btrim(name)));

create index if not exists categories_user_sort_idx
  on public.categories (user_id, sort_order, created_at);

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_url text not null,
  normalized_url text not null,
  title text not null,
  description text,
  thumbnail_url text,
  domain text not null,
  memo text,
  metadata_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint insights_original_url_not_blank check (length(btrim(original_url)) > 0),
  constraint insights_normalized_url_not_blank check (length(btrim(normalized_url)) > 0),
  constraint insights_metadata_status_check check (
    metadata_status in ('pending', 'ready', 'failed')
  )
);

create unique index if not exists insights_user_normalized_url_unique_idx
  on public.insights (user_id, normalized_url);

create index if not exists insights_user_created_idx
  on public.insights (user_id, created_at desc);

create table if not exists public.insight_categories (
  insight_id uuid not null references public.insights(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (insight_id, category_id)
);

create index if not exists insight_categories_user_idx
  on public.insight_categories (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists insights_set_updated_at on public.insights;
create trigger insights_set_updated_at
before update on public.insights
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, '사용자'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
```

- [ ] **Step 2: RLS 정책을 같은 파일 하단에 추가**

Append to `supabase/migrations/0001_init_amadda_schema.sql`:

```sql
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.insights enable row level security;
alter table public.insight_categories enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own categories" on public.categories;
create policy "Users can read own categories"
on public.categories for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own categories" on public.categories;
create policy "Users can insert own categories"
on public.categories for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own categories" on public.categories;
create policy "Users can update own categories"
on public.categories for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own categories" on public.categories;
create policy "Users can delete own categories"
on public.categories for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own insights" on public.insights;
create policy "Users can read own insights"
on public.insights for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own insights" on public.insights;
create policy "Users can insert own insights"
on public.insights for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own insights" on public.insights;
create policy "Users can update own insights"
on public.insights for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own insights" on public.insights;
create policy "Users can delete own insights"
on public.insights for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own insight categories" on public.insight_categories;
create policy "Users can read own insight categories"
on public.insight_categories for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own insight categories" on public.insight_categories;
create policy "Users can insert own insight categories"
on public.insight_categories for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.insights
    where insights.id = insight_id
      and insights.user_id = auth.uid()
  )
  and exists (
    select 1 from public.categories
    where categories.id = category_id
      and categories.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own insight categories" on public.insight_categories;
create policy "Users can delete own insight categories"
on public.insight_categories for delete
using (auth.uid() = user_id);
```

- [ ] **Step 3: SQL 파일 문법 검토**

Run:

```bash
npx supabase db lint --local
```

Expected:

```text
No schema errors found
```

If the local Supabase stack is not configured, apply the SQL in the Supabase SQL Editor and verify that all tables appear under `public`.

- [ ] **Step 4: 커밋**

Run:

```bash
git add supabase/migrations/0001_init_amadda_schema.sql
git commit -m "feat: Supabase 데이터 모델과 RLS 정책 추가"
```

---

### Task 3: 프론트엔드 데이터베이스 타입 작성

**Files:**

- Create: `src/shared/api/database.types.ts`

- [ ] **Step 1: 타입 파일 작성**

Create `src/shared/api/database.types.ts`:

```ts
export type ProfileRow = {
  avatar_url: string | null;
  created_at: string;
  display_name: string;
  email: string | null;
  id: string;
  onboarding_completed: boolean;
  updated_at: string;
};

export type CategoryRow = {
  color: string;
  created_at: string;
  id: string;
  name: string;
  sort_order: number;
  updated_at: string;
  user_id: string;
};

export type InsightRow = {
  created_at: string;
  description: string | null;
  domain: string;
  id: string;
  memo: string | null;
  metadata_status: 'pending' | 'ready' | 'failed';
  normalized_url: string;
  original_url: string;
  thumbnail_url: string | null;
  title: string;
  updated_at: string;
  user_id: string;
};

export type InsightCategoryRow = {
  category_id: string;
  created_at: string;
  insight_id: string;
  user_id: string;
};

export type CategoryInsert = Omit<
  CategoryRow,
  'created_at' | 'id' | 'updated_at'
>;

export type InsightInsert = Omit<
  InsightRow,
  'created_at' | 'id' | 'updated_at'
>;
```

- [ ] **Step 2: 빌드 확인**

Run:

```bash
npm run build
```

Expected:

```text
✓ built in
```

- [ ] **Step 3: 커밋**

Run:

```bash
git add src/shared/api/database.types.ts
git commit -m "feat: Supabase 테이블 타입 추가"
```

---

### Task 4: Supabase 적용 문서 작성

**Files:**

- Create: `docs/supabase-setup.md`

- [ ] **Step 1: 설정 문서 작성**

Create `docs/supabase-setup.md`:

```md
# Supabase 설정

## 환경 변수

`.env`에 다음 값을 설정한다.

```text
VITE_SUPABASE_URL=Supabase Project URL
VITE_SUPABASE_ANON_KEY=Supabase anon public key
```

프론트엔드에는 service role key를 넣지 않는다.

## SQL 적용

`supabase/migrations/0001_init_amadda_schema.sql`의 내용을 Supabase SQL Editor에서 실행한다.

적용 후 확인할 테이블:

- `profiles`
- `categories`
- `insights`
- `insight_categories`

## RLS 확인

Supabase Table Editor에서 모든 테이블의 RLS가 켜져 있는지 확인한다.

앱에서 확인할 동작:

- 로그인한 사용자는 자신의 카테고리와 인사이트만 볼 수 있다.
- 다른 사용자의 URL이나 카테고리 데이터는 조회되지 않는다.
- 카테고리를 삭제해도 인사이트는 삭제되지 않고 연결만 사라진다.
```

- [ ] **Step 2: 커밋**

Run:

```bash
git add docs/supabase-setup.md
git commit -m "docs: Supabase 설정 문서 추가"
```

---

## Self-Review

**Spec coverage:**

- 모든 P0 데이터 테이블과 연결 테이블을 포함했다.
- 사용자별 카테고리 이름 중복과 URL 중복 방지 인덱스를 포함했다.
- RLS 정책은 `auth.uid()` 기반으로 작성했다.
- service role key를 프론트엔드에서 사용하지 않는 원칙을 설정 문서에 명시했다.

**Placeholder scan:**

- 금지된 자리표시자 표현은 본문에 사용하지 않았다.
- SQL과 타입 파일은 실행 가능한 형태로 작성했다.

**Type consistency:**

- SQL 컬럼명과 TypeScript row 타입의 필드명이 일치한다.
- `metadata_status` 값은 SQL check constraint와 TypeScript union이 일치한다.

## Execution Handoff

계획 작성이 완료되었고 `docs/superpowers/plans/amadda-data-model.md`에 저장되었다. 실행 방식은 두 가지다.

**1. Subagent-Driven (recommended)** - 태스크마다 새 subagent를 투입하고, 각 태스크 사이에 리뷰하며 빠르게 반복한다.

**2. Inline Execution** - 현재 세션에서 `executing-plans` 방식으로 실행하고, 중간 체크포인트마다 검토한다.

어떤 방식으로 실행할지 선택한다.
