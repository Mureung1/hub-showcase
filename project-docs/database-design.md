# Pick My Clothes 데이터베이스 설계

## 1. 문서 목적

이 문서는 Pick My Clothes 서비스에서 필요한 데이터를 정의하고, Supabase에 실제 데이터베이스를 구축하기 위한 기준을 정리한 문서이다.

Pick My Clothes는 사용자가 날씨, 장소, 상황에 맞는 코디를 추천받고, 자신의 옷을 등록하며, 마음에 드는 코디를 다이어리에 저장할 수 있는 서비스이다.

이번 데이터베이스 설계에서는 다음 기능을 지원하는 것을 목표로 한다.

- 회원가입 및 로그인
- 사용자 프로필 관리
- 사용자 옷장 관리
- 날씨·장소·상황 입력
- AI 코디 추천 결과 저장
- 추천에 사용된 의류 저장
- 코디 다이어리 저장
- 사용자 선호 스타일 저장

---

# 2. 데이터베이스 구성 원칙

## 인증 정보 관리

사용자의 이메일과 비밀번호는 직접 만든 테이블에 저장하지 않는다.

회원가입과 로그인은 Supabase Auth를 사용한다.

Supabase Auth는 내부적으로 다음 정보를 관리한다.

- 사용자 고유 ID
- 이메일
- 암호화된 비밀번호
- 가입 날짜
- 마지막 로그인 날짜

사용자의 닉네임과 선호 스타일 등 서비스에서 필요한 추가 정보는 `profiles` 테이블에 저장한다.

---

## 테이블 관계

```text
Supabase Auth Users
        │
        │ 1 : 1
        ▼
     profiles
        │
        ├── 1 : N ── closet_items
        │
        ├── 1 : N ── recommendations
        │                  │
        │                  └── 1 : N ── recommendation_items
        │
        ├── 1 : N ── diary_entries
        │
        └── 1 : 1 ── user_preferences
```

---

# 3. 테이블 목록

| 테이블명 | 역할 |
|---|---|
| `profiles` | 사용자의 추가 프로필 정보 저장 |
| `user_preferences` | 사용자의 선호 스타일 및 추천 설정 저장 |
| `closet_items` | 사용자가 등록한 보유 의류 저장 |
| `recommendations` | AI 코디 추천 요청 및 결과 저장 |
| `recommendation_items` | 추천 코디에 포함된 의류 목록 저장 |
| `diary_entries` | 사용자가 저장한 코디 다이어리 기록 |
| `diary_stickers` | 다이어리에 배치한 스티커 정보 저장 |

---

# 4. profiles 테이블

## 역할

Supabase Auth 사용자와 연결되는 서비스 프로필 정보를 저장한다.

비밀번호는 절대 이 테이블에 저장하지 않는다.

## 컬럼

| 컬럼명 | 자료형 | 필수 | 설명 |
|---|---|---:|---|
| `id` | UUID | O | Supabase Auth의 사용자 ID |
| `nickname` | TEXT | O | 사용자 닉네임 |
| `avatar_url` | TEXT | X | 프로필 이미지 주소 |
| `introduction` | TEXT | X | 사용자 소개 |
| `created_at` | TIMESTAMPTZ | O | 프로필 생성 시간 |
| `updated_at` | TIMESTAMPTZ | O | 프로필 수정 시간 |

## 예시 데이터

```json
{
  "id": "사용자 UUID",
  "nickname": "경민",
  "avatar_url": null,
  "introduction": "핑크색과 빈티지 스타일을 좋아해요.",
  "created_at": "2026-07-15T10:00:00Z",
  "updated_at": "2026-07-15T10:00:00Z"
}
```

---

# 5. user_preferences 테이블

## 역할

사용자가 선호하는 코디 스타일과 추천 옵션을 저장한다.

## 컬럼

| 컬럼명 | 자료형 | 필수 | 설명 |
|---|---|---:|---|
| `id` | UUID | O | 설정 데이터 고유 ID |
| `user_id` | UUID | O | 사용자 ID |
| `preferred_styles` | TEXT[] | X | 선호 스타일 배열 |
| `preferred_colors` | TEXT[] | X | 선호 색상 배열 |
| `avoided_colors` | TEXT[] | X | 피하고 싶은 색상 배열 |
| `preferred_fit` | TEXT | X | 선호 핏 |
| `include_new_items` | BOOLEAN | O | 새 옷 포함 추천 여부 |
| `created_at` | TIMESTAMPTZ | O | 생성 시간 |
| `updated_at` | TIMESTAMPTZ | O | 수정 시간 |

## 추천 값 예시

### preferred_styles

```text
casual
street
feminine
minimal
vintage
formal
sporty
```

### preferred_fit

```text
slim
regular
oversized
```

---

# 6. closet_items 테이블

## 역할

사용자가 자신의 옷장에 등록한 실제 의류를 저장한다.

## 컬럼

| 컬럼명 | 자료형 | 필수 | 설명 |
|---|---|---:|---|
| `id` | UUID | O | 의류 고유 ID |
| `user_id` | UUID | O | 의류 소유 사용자 ID |
| `name` | TEXT | O | 사용자가 지정한 의류 이름 |
| `category` | TEXT | O | 의류 카테고리 |
| `subcategory` | TEXT | X | 세부 카테고리 |
| `color` | TEXT | X | 대표 색상 |
| `style_tags` | TEXT[] | X | 스타일 태그 |
| `season_tags` | TEXT[] | X | 계절 태그 |
| `image_url` | TEXT | X | 의류 사진 주소 |
| `description` | TEXT | X | 의류 설명 |
| `is_favorite` | BOOLEAN | O | 즐겨찾기 여부 |
| `created_at` | TIMESTAMPTZ | O | 등록 시간 |
| `updated_at` | TIMESTAMPTZ | O | 수정 시간 |

## category 권장 값

```text
top
bottom
outer
dress
shoes
bag
accessory
```

## season_tags 권장 값

```text
spring
summer
fall
winter
all-season
```

## 예시 데이터

```json
{
  "name": "핑크 리본 가디건",
  "category": "outer",
  "subcategory": "cardigan",
  "color": "pink",
  "style_tags": ["feminine", "cute", "casual"],
  "season_tags": ["spring", "fall"],
  "image_url": "https://...",
  "description": "데이트나 카페 약속에 잘 어울리는 가디건",
  "is_favorite": true
}
```

---

# 7. recommendations 테이블

## 역할

사용자가 입력한 추천 조건과 AI가 생성한 코디 추천 결과를 저장한다.

## 컬럼

| 컬럼명 | 자료형 | 필수 | 설명 |
|---|---|---:|---|
| `id` | UUID | O | 추천 결과 고유 ID |
| `user_id` | UUID | O | 추천을 요청한 사용자 ID |
| `weather` | TEXT | O | 날씨 |
| `temperature` | NUMERIC | X | 기온 |
| `place` | TEXT | O | 방문 장소 |
| `situation` | TEXT | O | 일정 및 상황 |
| `mood` | TEXT | X | 원하는 분위기 |
| `recommendation_mode` | TEXT | O | 추천 모드 |
| `title` | TEXT | O | AI 추천 제목 |
| `recommendation_text` | TEXT | O | AI 추천 설명 |
| `ai_source` | TEXT | X | 추천 생성 방식 |
| `is_saved` | BOOLEAN | O | 사용자의 저장 여부 |
| `created_at` | TIMESTAMPTZ | O | 추천 생성 시간 |

## recommendation_mode 권장 값

```text
closet
new-items
mixed
conversation
```

## ai_source 권장 값

```text
gemini
mock
local-fallback
```

## 예시 데이터

```json
{
  "weather": "cloudy",
  "temperature": 18,
  "place": "cafe",
  "situation": "date",
  "mood": "lovely",
  "recommendation_mode": "closet",
  "title": "흐린 날의 핑크빛 데이트",
  "recommendation_text": "부드러운 핑크 가디건과 데님 스커트를 함께 입어보세요.",
  "ai_source": "gemini",
  "is_saved": true
}
```

---

# 8. recommendation_items 테이블

## 역할

하나의 AI 추천 결과에 포함된 여러 의류 아이템을 저장한다.

추천 결과 하나에는 상의, 하의, 신발, 가방 등 여러 아이템이 포함될 수 있으므로 별도 테이블로 분리한다.

## 컬럼

| 컬럼명 | 자료형 | 필수 | 설명 |
|---|---|---:|---|
| `id` | UUID | O | 추천 아이템 고유 ID |
| `recommendation_id` | UUID | O | 연결된 추천 결과 ID |
| `closet_item_id` | UUID | X | 사용자의 옷장 아이템 ID |
| `item_name` | TEXT | O | 추천 아이템 이름 |
| `category` | TEXT | O | 아이템 카테고리 |
| `image_url` | TEXT | X | 아이템 이미지 |
| `is_owned` | BOOLEAN | O | 사용자가 보유한 옷인지 여부 |
| `shopping_url` | TEXT | X | 구매 링크 |
| `display_order` | INTEGER | O | 화면 출력 순서 |
| `created_at` | TIMESTAMPTZ | O | 생성 시간 |

## 예시

```json
[
  {
    "item_name": "화이트 블라우스",
    "category": "top",
    "is_owned": true,
    "display_order": 1
  },
  {
    "item_name": "데님 스커트",
    "category": "bottom",
    "is_owned": true,
    "display_order": 2
  },
  {
    "item_name": "메리제인 슈즈",
    "category": "shoes",
    "is_owned": false,
    "shopping_url": "https://...",
    "display_order": 3
  }
]
```

---

# 9. diary_entries 테이블

## 역할

사용자가 마음에 드는 추천 코디를 자신의 다이어리에 저장할 때 사용한다.

## 컬럼

| 컬럼명 | 자료형 | 필수 | 설명 |
|---|---|---:|---|
| `id` | UUID | O | 다이어리 기록 고유 ID |
| `user_id` | UUID | O | 사용자 ID |
| `recommendation_id` | UUID | X | 연결된 추천 결과 ID |
| `title` | TEXT | O | 다이어리 제목 |
| `memo` | TEXT | X | 사용자 메모 |
| `outfit_image_url` | TEXT | X | 코디 이미지 |
| `worn_date` | DATE | X | 실제 착용 날짜 |
| `rating` | INTEGER | X | 코디 만족도 |
| `is_favorite` | BOOLEAN | O | 즐겨찾기 여부 |
| `created_at` | TIMESTAMPTZ | O | 기록 생성 시간 |
| `updated_at` | TIMESTAMPTZ | O | 기록 수정 시간 |

## rating 범위

```text
1 ~ 5
```

## 예시 데이터

```json
{
  "title": "친구들과 카페에 간 날",
  "memo": "조금 쌀쌀했지만 가디건을 챙겨서 좋았다.",
  "worn_date": "2026-07-16",
  "rating": 5,
  "is_favorite": true
}
```

---

# 10. diary_stickers 테이블

## 역할

스티커 다이어리 화면에서 사용자가 배치한 캐릭터나 스티커의 종류와 위치를 저장한다.

## 컬럼

| 컬럼명 | 자료형 | 필수 | 설명 |
|---|---|---:|---|
| `id` | UUID | O | 스티커 고유 ID |
| `diary_entry_id` | UUID | O | 연결된 다이어리 기록 ID |
| `sticker_type` | TEXT | O | 스티커 종류 |
| `sticker_image_url` | TEXT | X | 커스텀 스티커 이미지 |
| `position_x` | NUMERIC | O | X축 위치 |
| `position_y` | NUMERIC | O | Y축 위치 |
| `scale` | NUMERIC | O | 스티커 크기 |
| `rotation` | NUMERIC | O | 회전 각도 |
| `z_index` | INTEGER | O | 화면에서의 쌓임 순서 |
| `created_at` | TIMESTAMPTZ | O | 생성 시간 |

## sticker_type 예시

```text
pixel-character
heart
star
ribbon
flower
speech-bubble
weather-icon
```

---

# 11. Supabase SQL

아래 SQL은 Supabase Dashboard의 SQL Editor에서 실행할 수 있도록 작성한 초기 테이블 생성 코드이다.

```sql
create extension if not exists "pgcrypto";

-- 사용자 프로필
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_url text,
  introduction text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 사용자 선호 설정
create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  preferred_styles text[] default '{}',
  preferred_colors text[] default '{}',
  avoided_colors text[] default '{}',
  preferred_fit text,
  include_new_items boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 옷장 아이템
create table public.closet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  subcategory text,
  color text,
  style_tags text[] default '{}',
  season_tags text[] default '{}',
  image_url text,
  description text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- AI 추천 결과
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weather text not null,
  temperature numeric,
  place text not null,
  situation text not null,
  mood text,
  recommendation_mode text not null default 'closet',
  title text not null,
  recommendation_text text not null,
  ai_source text,
  is_saved boolean not null default false,
  created_at timestamptz not null default now()
);

-- 추천에 포함된 아이템
create table public.recommendation_items (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null
    references public.recommendations(id) on delete cascade,
  closet_item_id uuid
    references public.closet_items(id) on delete set null,
  item_name text not null,
  category text not null,
  image_url text,
  is_owned boolean not null default true,
  shopping_url text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 코디 다이어리
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_id uuid
    references public.recommendations(id) on delete set null,
  title text not null,
  memo text,
  outfit_image_url text,
  worn_date date,
  rating integer check (rating between 1 and 5),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 다이어리 스티커
create table public.diary_stickers (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null
    references public.diary_entries(id) on delete cascade,
  sticker_type text not null,
  sticker_image_url text,
  position_x numeric not null default 0,
  position_y numeric not null default 0,
  scale numeric not null default 1,
  rotation numeric not null default 0,
  z_index integer not null default 0,
  created_at timestamptz not null default now()
);
```

---

# 12. 데이터 유효성 검사 제약조건

추천 모드와 의류 카테고리에 잘못된 값이 들어가지 않도록 제약조건을 추가한다.

```sql
alter table public.closet_items
add constraint closet_items_category_check
check (
  category in (
    'top',
    'bottom',
    'outer',
    'dress',
    'shoes',
    'bag',
    'accessory'
  )
);

alter table public.recommendations
add constraint recommendations_mode_check
check (
  recommendation_mode in (
    'closet',
    'new-items',
    'mixed',
    'conversation'
  )
);
```

---

# 13. 성능을 위한 인덱스

사용자별 데이터 조회와 날짜별 조회 속도를 높이기 위해 인덱스를 생성한다.

```sql
create index closet_items_user_id_idx
on public.closet_items(user_id);

create index recommendations_user_id_idx
on public.recommendations(user_id);

create index recommendations_created_at_idx
on public.recommendations(created_at desc);

create index recommendation_items_recommendation_id_idx
on public.recommendation_items(recommendation_id);

create index diary_entries_user_id_idx
on public.diary_entries(user_id);

create index diary_entries_worn_date_idx
on public.diary_entries(worn_date desc);

create index diary_stickers_diary_entry_id_idx
on public.diary_stickers(diary_entry_id);
```

---

# 14. Row Level Security 설정

Supabase에서는 사용자가 자신의 데이터에만 접근할 수 있도록 RLS를 설정해야 한다.

## RLS 활성화

```sql
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.closet_items enable row level security;
alter table public.recommendations enable row level security;
alter table public.recommendation_items enable row level security;
alter table public.diary_entries enable row level security;
alter table public.diary_stickers enable row level security;
```

## profiles 정책

```sql
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
```

## user_preferences 정책

```sql
create policy "Users can manage own preferences"
on public.user_preferences
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## closet_items 정책

```sql
create policy "Users can view own closet"
on public.closet_items
for select
using (auth.uid() = user_id);

create policy "Users can insert own closet items"
on public.closet_items
for insert
with check (auth.uid() = user_id);

create policy "Users can update own closet items"
on public.closet_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own closet items"
on public.closet_items
for delete
using (auth.uid() = user_id);
```

## recommendations 정책

```sql
create policy "Users can manage own recommendations"
on public.recommendations
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## recommendation_items 정책

```sql
create policy "Users can manage own recommendation items"
on public.recommendation_items
for all
using (
  exists (
    select 1
    from public.recommendations
    where recommendations.id = recommendation_items.recommendation_id
      and recommendations.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.recommendations
    where recommendations.id = recommendation_items.recommendation_id
      and recommendations.user_id = auth.uid()
  )
);
```

## diary_entries 정책

```sql
create policy "Users can manage own diary entries"
on public.diary_entries
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## diary_stickers 정책

```sql
create policy "Users can manage own diary stickers"
on public.diary_stickers
for all
using (
  exists (
    select 1
    from public.diary_entries
    where diary_entries.id = diary_stickers.diary_entry_id
      and diary_entries.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.diary_entries
    where diary_entries.id = diary_stickers.diary_entry_id
      and diary_entries.user_id = auth.uid()
  )
);
```

---

# 15. 회원가입 시 프로필 자동 생성

Supabase Auth에서 사용자가 가입할 때 `profiles` 데이터를 자동으로 생성하는 함수이다.

회원가입 요청에서 닉네임을 metadata에 넣어 전달해야 한다.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', '새 사용자')
  );

  insert into public.user_preferences (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

# 16. updated_at 자동 갱신

```sql
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
before update on public.profiles
for each row execute procedure public.update_updated_at_column();

create trigger update_preferences_updated_at
before update on public.user_preferences
for each row execute procedure public.update_updated_at_column();

create trigger update_closet_items_updated_at
before update on public.closet_items
for each row execute procedure public.update_updated_at_column();

create trigger update_diary_entries_updated_at
before update on public.diary_entries
for each row execute procedure public.update_updated_at_column();
```

---

# 17. Supabase Storage 설계

의류 이미지와 프로필 이미지는 데이터베이스에 직접 저장하지 않고 Supabase Storage에 저장한다.

## 생성할 Bucket

| Bucket 이름 | 역할 | 공개 여부 |
|---|---|---|
| `avatars` | 사용자 프로필 이미지 | Public 또는 제한 공개 |
| `closet-images` | 사용자가 등록한 의류 사진 | Private 권장 |
| `outfit-images` | 저장한 코디 이미지 | Private 권장 |
| `stickers` | 서비스 기본 스티커 이미지 | Public |

## 파일 경로 권장 구조

```text
avatars/{userId}/profile.png

closet-images/{userId}/{itemId}.png

outfit-images/{userId}/{diaryEntryId}.png

stickers/default/heart.png
stickers/default/pixel