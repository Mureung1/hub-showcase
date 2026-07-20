-- SPEC-DB-001 5장 — 다음 Question 생성 RPC
-- 같은 Chat 안에서 sequence_number 를 원자적으로 max+1 로 계산해 insert.
-- SECURITY INVOKER → 호출자 RLS 적용: 소유하지 않은 chat 이면 INSERT WITH CHECK 로 차단,
-- 미완료 Question 이 이미 있으면 Partial Unique Index(questions_one_open_per_chat)로 차단.
create or replace function public.create_next_question(p_chat_id uuid, p_message text)
returns table (question_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_seq integer;
  v_qid uuid;
begin
  select coalesce(max(sequence_number), 0) + 1
    into v_seq
    from questions
    where chat_id = p_chat_id;

  insert into questions (chat_id, sequence_number, message, status)
    values (p_chat_id, v_seq, p_message, 'processing')
    returning id into v_qid;

  return query select v_qid;
end;
$$;

grant execute on function public.create_next_question(uuid, text) to authenticated;
