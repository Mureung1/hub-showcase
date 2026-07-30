-- 결과 집계를 DB에서 수행하는 함수들.
-- 예전엔 서버(JS)가 responses 전체 행을 끌어와 집계했는데, PostgREST 기본 1000행 제한에
-- 조용히 잘려 집계가 틀어질 수 있어(참여자 1명이 넓은 범위를 다 선택해도 최대 31일×48=1488행)
-- group by를 DB로 옮긴다. 함수가 행 여러 개가 아니라 jsonb 한 덩어리를 반환하므로
-- RPC 응답에도 걸리는 1000행 제한과 무관하다.

-- 슬롯별 가능/선호 인원 집계.
-- availableCount가 0인 슬롯은 group by에 등장하지 않으므로 결과에 포함되지 않는다(기존 동작과 동일).
create or replace function get_slot_counts(p_appointment_id uuid)
returns jsonb
language sql
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', s.date,
        'time', s.time,
        'availableCount', s.available_count,
        'preferredCount', s.preferred_count
      )
    ),
    '[]'::jsonb
  )
  from (
    select
      r.date,
      r.time,
      count(*)::int as available_count,
      count(*) filter (where r.is_preferred)::int as preferred_count
    from responses r
    join participants p on p.id = r.participant_id
    where p.appointment_id = p_appointment_id
    group by r.date, r.time
    order by r.date, r.time
  ) s;
$$;

-- 응답을 하나라도 남긴 참여자 수(= 일정 입력 완료 인원). 스칼라 한 값이라 행 제한과 무관.
create or replace function get_completed_count(p_appointment_id uuid)
returns int
language sql
stable
as $$
  select count(distinct r.participant_id)::int
  from responses r
  join participants p on p.id = r.participant_id
  where p.appointment_id = p_appointment_id;
$$;

-- 참여자별 완료 여부 목록. exists로 응답 유무만 확인한다.
create or replace function get_participants_status(p_appointment_id uuid)
returns jsonb
language sql
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'completed', exists (select 1 from responses r where r.participant_id = p.id)
      )
      order by p.created_at
    ),
    '[]'::jsonb
  )
  from participants p
  where p.appointment_id = p_appointment_id;
$$;
