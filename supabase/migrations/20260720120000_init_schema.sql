-- SPEC-DB-001 — 서비스 스키마·제약·RLS·2-클라이언트 토대·BYOK 키 테이블
-- 값 원본: docs/data-model.md 3·4·5장. Enum 값은 @decision-log/shared 와 정확히 일치.
-- 소유권 경로: auth.users.id → chats.user_id → 하위(question_id·chat_id join).
-- 하위 테이블에 user_id 중복 저장하지 않고, RLS는 chats.user_id 까지 EXISTS join 으로 검사.

-- updated_at 자동 갱신 확장 (idempotent). Supabase 기본 extensions 스키마에 둔다.
create extension if not exists moddatetime with schema extensions;

-- =====================================================================
-- 1. Enum 6종 (data-model 4장 / shared enums.ts 와 정확히 일치)
-- =====================================================================
create type question_status as enum ('draft', 'processing', 'review_required', 'completed');
create type source_answer_status as enum ('pending', 'processing', 'succeeded', 'failed');
create type agenda_status as enum ('draft', 'conflicted', 'recheck_requested', 'reanswered', 'passed', 'rejected');
create type agenda_resolution_reason as enum (
  'auto_consensus',
  'user_accepted', 'user_accepted_after_recheck',
  'user_composed', 'user_composed_after_recheck',
  'user_rejected', 'user_rejected_after_recheck'
);
create type final_answer_generation_mode as enum ('multi_source', 'single_source_fallback', 'all_agendas_rejected');
create type ai_provider as enum ('claude', 'openai', 'gemini');

-- =====================================================================
-- 2. 테이블 (data-model 3.2~3.8)
-- =====================================================================

-- 2.1 chats
create table chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  title varchar(100) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chats_user_id_updated_at on chats (user_id, updated_at desc);

-- 2.2 questions
create table questions (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats (id) on delete cascade,
  sequence_number integer not null,
  message text not null,
  status question_status not null default 'draft',
  context_snapshot jsonb not null default '{}'::jsonb,
  context_version varchar(50) not null default 'v1',
  last_error_code varchar(100),
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint questions_chat_id_sequence_uk unique (chat_id, sequence_number),
  constraint questions_message_len_ck check (char_length(message) between 1 and 1000)
);
create index questions_chat_id_sequence on questions (chat_id, sequence_number);
-- 한 Chat에 미완료 Question 하나만 허용 (data-model 3.3)
create unique index questions_one_open_per_chat
  on questions (chat_id)
  where status in ('draft', 'processing', 'review_required');

-- 2.3 source_answers
create table source_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions (id) on delete cascade,
  provider ai_provider not null,
  model varchar(100) not null,
  status source_answer_status not null default 'pending',
  prompt_version varchar(100) not null,
  request_snapshot jsonb not null default '{}'::jsonb,
  raw_content text,
  structured_content jsonb,
  error_code varchar(100),
  error_message text,
  retry_count smallint not null default 0,
  excluded_from_comparison boolean not null default false,
  excluded_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_answers_question_provider_uk unique (question_id, provider),
  constraint source_answers_retry_count_ck check (retry_count between 0 and 1)
);
create index source_answers_question_id on source_answers (question_id);

-- 2.4 agendas (신규 필드 selected_source_ref·prompt_version 포함, data-model 3.5)
create table agendas (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions (id) on delete cascade,
  status agenda_status not null default 'draft',
  resolution_reason agenda_resolution_reason,
  title varchar(200) not null,
  summary text not null,
  selected_content text,
  selected_source_ref jsonb,
  user_note text,
  source_refs jsonb not null default '[]'::jsonb,
  prompt_version varchar(100),
  recheck_request text,
  recheck_result jsonb,
  recheck_requested_at timestamptz,
  reanswered_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 상태 ↔ resolution_reason 정합 (data-model 3.5)
  constraint agendas_status_reason_ck check (
    (status in ('draft', 'conflicted', 'recheck_requested', 'reanswered') and resolution_reason is null)
    or (status in ('passed', 'rejected') and resolution_reason is not null)
  ),
  -- passed 면 selected_content 필수
  constraint agendas_passed_content_ck check (
    status <> 'passed' or selected_content is not null
  ),
  -- selected_source_ref 값 부재 규칙 (1.6): 채택형=참조, 직접입력·제외·합의=NO_VALUE, 미판단=null
  constraint agendas_selected_source_ref_ck check (
    case
      when status in ('draft', 'conflicted', 'recheck_requested', 'reanswered')
        then selected_source_ref is null
      when resolution_reason in ('user_accepted', 'user_accepted_after_recheck')
        then (selected_source_ref is not null and selected_source_ref <> '"NO_VALUE"'::jsonb)
      when resolution_reason in (
        'user_composed', 'user_composed_after_recheck',
        'user_rejected', 'user_rejected_after_recheck',
        'auto_consensus'
      )
        then selected_source_ref = '"NO_VALUE"'::jsonb
      else true
    end
  )
);
create index agendas_question_id_status on agendas (question_id, status);

-- 2.5 final_answers (updated_at 없음 — data-model 3.6)
create table final_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions (id) on delete cascade,
  content text not null,
  generation_mode final_answer_generation_mode not null default 'multi_source',
  prompt_version varchar(100),
  input_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint final_answers_question_uk unique (question_id)
);

-- 2.6 decision_notes (chat_id 저장하지 않음 — data-model 3.7)
create table decision_notes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decision_notes_question_uk unique (question_id)
);

-- 2.7 user_provider_keys (BYOK, data-model 3.8) — AES-256-GCM 암호문만 저장
create table user_provider_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider ai_provider not null,
  encrypted_key text not null,
  key_iv text not null,
  key_auth_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_provider_keys_user_provider_uk unique (user_id, provider)
);

-- =====================================================================
-- 3. updated_at 자동 갱신 트리거 (moddatetime) — updated_at 있는 표만
-- =====================================================================
create trigger set_updated_at before update on chats
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on questions
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on source_answers
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on agendas
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on decision_notes
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on user_provider_keys
  for each row execute function extensions.moddatetime(updated_at);

-- =====================================================================
-- 4. RLS (ADR-002 / data-model 5장)
--    모든 서비스 테이블 RLS 활성화. 소유권은 chats.user_id 까지 EXISTS join.
--    RPC 가 SECURITY INVOKER 이므로 INSERT 는 WITH CHECK 정책이 반드시 필요.
-- =====================================================================
alter table chats enable row level security;
alter table questions enable row level security;
alter table source_answers enable row level security;
alter table agendas enable row level security;
alter table final_answers enable row level security;
alter table decision_notes enable row level security;
alter table user_provider_keys enable row level security;

-- 4.1 chats — 직접 소유
create policy chats_select on chats for select using (user_id = auth.uid());
create policy chats_insert on chats for insert with check (user_id = auth.uid());
create policy chats_update on chats for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4.2 questions — 소속 chat 소유 (EXISTS)
create policy questions_select on questions for select
  using (exists (select 1 from chats c where c.id = questions.chat_id and c.user_id = auth.uid()));
create policy questions_insert on questions for insert
  with check (exists (select 1 from chats c where c.id = questions.chat_id and c.user_id = auth.uid()));
create policy questions_update on questions for update
  using (exists (select 1 from chats c where c.id = questions.chat_id and c.user_id = auth.uid()))
  with check (exists (select 1 from chats c where c.id = questions.chat_id and c.user_id = auth.uid()));

-- 4.3 source_answers — 소속 question→chat 소유 (EXISTS)
create policy source_answers_select on source_answers for select
  using (exists (select 1 from questions q join chats c on c.id = q.chat_id
                 where q.id = source_answers.question_id and c.user_id = auth.uid()));
create policy source_answers_insert on source_answers for insert
  with check (exists (select 1 from questions q join chats c on c.id = q.chat_id
                      where q.id = source_answers.question_id and c.user_id = auth.uid()));
create policy source_answers_update on source_answers for update
  using (exists (select 1 from questions q join chats c on c.id = q.chat_id
                 where q.id = source_answers.question_id and c.user_id = auth.uid()))
  with check (exists (select 1 from questions q join chats c on c.id = q.chat_id
                      where q.id = source_answers.question_id and c.user_id = auth.uid()));

-- 4.4 agendas
create policy agendas_select on agendas for select
  using (exists (select 1 from questions q join chats c on c.id = q.chat_id
                 where q.id = agendas.question_id and c.user_id = auth.uid()));
create policy agendas_insert on agendas for insert
  with check (exists (select 1 from questions q join chats c on c.id = q.chat_id
                      where q.id = agendas.question_id and c.user_id = auth.uid()));
create policy agendas_update on agendas for update
  using (exists (select 1 from questions q join chats c on c.id = q.chat_id
                 where q.id = agendas.question_id and c.user_id = auth.uid()))
  with check (exists (select 1 from questions q join chats c on c.id = q.chat_id
                      where q.id = agendas.question_id and c.user_id = auth.uid()));

-- 4.5 final_answers (생성만 — 수정 없음)
create policy final_answers_select on final_answers for select
  using (exists (select 1 from questions q join chats c on c.id = q.chat_id
                 where q.id = final_answers.question_id and c.user_id = auth.uid()));
create policy final_answers_insert on final_answers for insert
  with check (exists (select 1 from questions q join chats c on c.id = q.chat_id
                      where q.id = final_answers.question_id and c.user_id = auth.uid()));

-- 4.6 decision_notes (생성만 — 저장 후 수정 API 없음)
create policy decision_notes_select on decision_notes for select
  using (exists (select 1 from questions q join chats c on c.id = q.chat_id
                 where q.id = decision_notes.question_id and c.user_id = auth.uid()));
create policy decision_notes_insert on decision_notes for insert
  with check (exists (select 1 from questions q join chats c on c.id = q.chat_id
                      where q.id = decision_notes.question_id and c.user_id = auth.uid()));

-- 4.7 user_provider_keys — 직접 소유 (본인 키만)
create policy user_provider_keys_select on user_provider_keys for select using (user_id = auth.uid());
create policy user_provider_keys_insert on user_provider_keys for insert with check (user_id = auth.uid());
create policy user_provider_keys_update on user_provider_keys for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_provider_keys_delete on user_provider_keys for delete using (user_id = auth.uid());

-- =====================================================================
-- 5. 원자적 생성 RPC (SPEC-DB-001 5장) — 새 Chat + 첫 Question 한 트랜잭션
--    SECURITY INVOKER → 호출자 RLS(위 WITH CHECK) 적용. 생성된 id 반환.
-- =====================================================================
create or replace function public.create_chat_with_first_question(p_message text)
returns table (chat_id uuid, question_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_chat_id uuid;
  v_question_id uuid;
begin
  insert into chats (user_id, title)
    values (auth.uid(), left(p_message, 100))
    returning id into v_chat_id;

  insert into questions (chat_id, sequence_number, message, status)
    values (v_chat_id, 1, p_message, 'processing')
    returning id into v_question_id;

  return query select v_chat_id, v_question_id;
end;
$$;

grant execute on function public.create_chat_with_first_question(text) to authenticated;
