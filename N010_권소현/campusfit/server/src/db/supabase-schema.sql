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
  team_board_count integer not null default 0,
  source_url text
);

-- listing_id는 listings(id)를 가리킬 수도, DB에 저장하지 않고 실시간으로 불러오는
-- 온통청년(youth-*) 리스팅을 가리킬 수도 있어서 외래키 제약을 걸지 않는다.
-- owner_token: 로그인이 없어서 "본인 글인지"를 서버가 확인할 방법이 없었다. 생성 시
-- 랜덤 토큰을 저장해두고 수정·삭제 요청에 같은 토큰이 와야만 허용한다.
create table board_posts (
  id text primary key,
  listing_id text not null,
  title text not null,
  meta text not null,
  body text not null,
  status text not null default 'recruiting',
  owner_token text
);

create table comments (
  id bigint generated always as identity primary key,
  post_id text not null references board_posts(id),
  who text not null,
  text text not null,
  created_at timestamptz not null default now(),
  owner_token text
);
