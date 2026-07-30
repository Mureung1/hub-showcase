-- 응답 제출(PUT .../responses)을 DB 함수 하나로 묶는다.
-- 예전엔 서버가 delete와 insert를 각각 별도 요청으로 보냈는데(PostgREST는 여러 요청을 한 트랜잭션으로
-- 묶어주지 않는다), delete만 성공하고 insert가 실패하면 참여자의 기존 응답이 전부 사라진 채 500이 나갔다.
-- 마감 후에는 재제출이 막혀 있어(responses.ts의 closedAt 검사) 마감 직전이면 영구 손실이었다.
-- Postgres 함수는 호출 전체가 하나의 트랜잭션이라, insert가 실패하면 delete까지 자동 롤백된다.

-- p_slots는 [{ "date": "2026-08-20", "time": "09:00", "is_preferred": true }, ...] 형태의 jsonb 배열.
-- 슬롯이 최대 1500개 남짓이라 행 배열 대신 jsonb 한 덩어리로 받는다(0005와 같은 이유로 1000행 제한과 무관).
create or replace function submit_response(
  p_participant_id uuid,
  p_slots jsonb
) returns void
language plpgsql
as $$
begin
  delete from responses where participant_id = p_participant_id;

  insert into responses (participant_id, date, time, is_preferred)
  select
    p_participant_id,
    (s->>'date')::date,
    (s->>'time')::time,
    (s->>'is_preferred')::boolean
  from jsonb_array_elements(p_slots) as s;
end;
$$;
