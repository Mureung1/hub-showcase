create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  raw_text text not null,
  emotion text not null,
  cause text not null,
  action text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.checkins enable row level security;

-- 감정 이모지 (선택 입력, 이모지 문자 자체를 저장)
alter table public.checkins add column if not exists mood text;

-- 첨부 사진 public URL (선택 입력)
-- 사전 준비: Supabase 대시보드 Storage에서 Public 버킷 `checkin-photos`를 만들어야 한다.
alter table public.checkins add column if not exists image_url text;

-- 기기 기록을 여러 번 복사해도 중복되지 않게 원본 ID를 보관한다.
alter table public.checkins add column if not exists client_record_id text;
create unique index if not exists checkins_user_client_record_unique
  on public.checkins (user_id, client_record_id);

-- 로그인 사용자만 본인 기록을 읽고 쓸 수 있다.
drop policy if exists "Users can view own checkins" on public.checkins;
create policy "Users can view own checkins"
  on public.checkins for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own checkins" on public.checkins;
create policy "Users can insert own checkins"
  on public.checkins for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own checkins" on public.checkins;
create policy "Users can update own checkins"
  on public.checkins for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own checkins" on public.checkins;
create policy "Users can delete own checkins"
  on public.checkins for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 기존 null 데이터는 유지하면서 새 로그인 기록의 소유자를 Auth 사용자와 연결한다.
do $$
begin
  alter table public.checkins
    add constraint checkins_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

-- 로그인 사용자의 사진은 UID를 첫 번째 폴더로 사용해 서로 분리한다.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'checkin-photos',
  'checkin-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own checkin photos" on storage.objects;
create policy "Users can upload own checkin photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'checkin-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete own checkin photos" on storage.objects;
create policy "Users can delete own checkin photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'checkin-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
