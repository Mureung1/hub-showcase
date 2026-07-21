-- Supabase SQL Editor에 이 파일 내용을 그대로 붙여넣고 Run 하세요.
-- 기존 server/src/db/client.js의 SQLite 스키마를 Postgres용으로 옮긴 것.
-- desc는 Postgres 예약어라 컬럼명으로 못 써서 description으로 바꿈
-- (API 응답 필드명 desc는 서버 코드에서 매핑해서 그대로 유지할 예정).

drop table if exists comments cascade;
drop table if exists board_posts cascade;
drop table if exists listings cascade;
drop table if exists categories cascade;

create table categories (
  id text primary key,
  label text not null,
  description text not null
);

create table listings (
  id text primary key,
  category_id text not null references categories(id),
  title text not null,
  description text not null,
  deadline_date text not null,
  eligible_regions text,
  eligible_grades text,
  interest text,
  team_board_count integer not null default 0
);

create table board_posts (
  id text primary key,
  listing_id text not null references listings(id),
  title text not null,
  meta text not null,
  body text not null
);

create table comments (
  id bigint generated always as identity primary key,
  post_id text not null references board_posts(id),
  who text not null,
  text text not null,
  created_at timestamptz not null default now()
);
