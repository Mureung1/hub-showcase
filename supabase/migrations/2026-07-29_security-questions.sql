-- =====================================================================
-- 게이미피케이션 v3: 비밀번호 찾기(보안 질문 방식, FR-21)
-- Supabase 대시보드 > SQL Editor에 전체를 붙여넣고 Run 하세요.
-- schema.sql(전체 스냅샷)에도 동일 내용이 반영되어 있습니다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- security_questions — 비밀번호 찾기용 보안 질문/답변 해시.
--
-- 이 앱의 로그인 ID는 실제로 메일을 주고받지 않는 합성 이메일(<id>@mealyze.app, src/lib/authId.js)로
-- Supabase Auth에 등록되어 있어 이메일 인증 기반 비밀번호 재설정이 불가능하다 — 그래서 가입 시 등록한
-- 보안 질문/답으로 본인 확인 후 서버가 비밀번호를 직접 바꿔주는 방식으로 대체한다.
--
-- answer_hash/answer_salt는 사용자 본인에게도 노출하지 않는다(어떤 라우트도 이 값을 응답에 포함하지
-- 않음, server/auth/securityAnswer.js 참고) — 그래서 이 테이블은 RLS를 켜되 정책을 하나도 만들지
-- 않는다: anon/authenticated 어느 쪽도 직접 select/insert/update/delete할 수 없고, 오직 서버가
-- SUPABASE_SERVICE_ROLE_KEY(RLS 우회)로만 접근한다(server/supabaseAdmin.js).
--
-- login_id 컬럼: 비밀번호 재설정은 로그인 전(세션 없음) 상태에서 진행되므로 auth.uid()를 쓸 수 없다
-- — 서버가 사용자가 입력한 아이디로 이 행을 직접 조회할 수 있도록 별도 컬럼으로 둔다(authId.js의
-- normalizeLoginId와 동일한 소문자 규칙으로 저장 — 클라이언트가 register 호출 전에 이미 정규화해서 보냄).
-- ---------------------------------------------------------------------
create table if not exists public.security_questions (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  login_id      text not null unique,
  question_id   text not null,
  answer_hash   text not null,   -- crypto.scrypt 해시(hex)
  answer_salt   text not null,   -- 사용자별 salt(hex)
  fail_count    smallint not null default 0,
  locked_until  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.security_questions is
  '비밀번호 찾기용 보안 질문/답변 해시. 클라이언트는 RLS로 전부 차단 — 서버(SERVICE_ROLE_KEY)만 읽고 쓴다.';

alter table public.security_questions enable row level security;
-- 정책을 하나도 만들지 않는다(위 주석 참고) — RLS enable만으로 anon/authenticated 접근이 전부 막힌다.

create or replace function public.set_updated_at_security_questions()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_security_questions_updated_at on public.security_questions;
create trigger trg_security_questions_updated_at
  before update on public.security_questions
  for each row
  execute function public.set_updated_at_security_questions();

-- =====================================================================
-- 점검용
-- =====================================================================
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'security_questions';
-- select policyname from pg_policies where schemaname = 'public' and tablename = 'security_questions'; -- 0행이어야 정상
