-- 안 읽은 메세지 수 표시를 위한 사용자별 채팅방 마지막 읽음 시각 기록
-- 기준 문서: docs/db-schema.md, docs/api.md (채팅 API 절)

create table message_read_states (
  application_id uuid not null references applications (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (application_id, user_id)
);

alter table message_read_states enable row level security;

-- 본인의 읽음 상태만 조회 가능
create policy message_read_states_select_own on message_read_states
for select using (
  user_id = auth.uid()
);

-- 참여자(신청 멘티 또는 확정 멘토)만, 본인 명의로만 읽음 상태 생성 가능
create policy message_read_states_insert_own on message_read_states
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from applications a
    where a.id = message_read_states.application_id
      and (a.mentee_id = auth.uid() or a.accepted_mentor_id = auth.uid())
  )
);

-- 본인의 읽음 상태만 갱신 가능
create policy message_read_states_update_own on message_read_states
for update using (
  user_id = auth.uid()
) with check (
  user_id = auth.uid()
);

-- 사용자가 참여 중인 신청별 안 읽은 메세지 수 조회
create or replace function get_unread_message_counts(p_user_id uuid)
returns table (application_id uuid, unread_count bigint)
language sql
stable
as $$
  select
    a.id as application_id,
    count(m.id) filter (
      where m.sender_id != p_user_id
        and m.created_at > coalesce(rs.last_read_at, 'epoch'::timestamptz)
    ) as unread_count
  from applications a
  left join messages m on m.application_id = a.id
  left join message_read_states rs
    on rs.application_id = a.id and rs.user_id = p_user_id
  where a.mentee_id = p_user_id or a.accepted_mentor_id = p_user_id
  group by a.id;
$$;
