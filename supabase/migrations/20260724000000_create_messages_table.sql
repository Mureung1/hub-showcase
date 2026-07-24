-- confirmed 신청 당사자(멘티/수락 멘토) 간 실시간 채팅 메시지
-- 기준 문서: docs/db-schema.md, docs/api.md (채팅 API 절)

create table messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_not_blank check (
    length(trim(body)) > 0 and length(body) <= 2000
  )
);

create index idx_messages_application_created_at on messages (application_id, created_at);

alter table messages enable row level security;

-- 참여자(신청 멘티 또는 확정 멘토)만 조회 가능
create policy messages_select_participants on messages
for select using (
  exists (
    select 1 from applications a
    where a.id = messages.application_id
      and (a.mentee_id = auth.uid() or a.accepted_mentor_id = auth.uid())
  )
);

-- 참여자이면서, 신청이 confirmed 상태이고, 본인 명의로만 전송 가능
create policy messages_insert_participants_confirmed on messages
for insert with check (
  sender_id = auth.uid()
  and exists (
    select 1 from applications a
    where a.id = messages.application_id
      and a.status = 'confirmed'
      and (a.mentee_id = auth.uid() or a.accepted_mentor_id = auth.uid())
  )
);

alter publication supabase_realtime add table messages;
