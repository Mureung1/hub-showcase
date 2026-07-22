-- 신청 생성 시 applications + application_mentors를 하나의 트랜잭션으로 저장하는 RPC
-- 기준 문서: docs/api.md (6.1 신청 생성) "생성 작업은 applications와 application_mentors를
-- 하나의 트랜잭션으로 처리"
--
-- mentorIds 개수(1~3)/중복/존재 여부, 질문지 4문항 필수 여부는
-- 애플리케이션 계층(server/src/services/applications.service.js)에서
-- 이 함수를 호출하기 전에 검증한다. 이 함수는 원자적 저장만 책임진다.

create or replace function create_application_with_mentors(
  p_mentee_id uuid,
  p_introduction text,
  p_concern text,
  p_goal text,
  p_preferred_time text,
  p_mentor_ids uuid[]
)
returns applications
language plpgsql
as $$
declare
  v_application applications;
  v_mentor_id uuid;
begin
  insert into applications (mentee_id, introduction, concern, goal, preferred_time)
  values (p_mentee_id, p_introduction, p_concern, p_goal, p_preferred_time)
  returning * into v_application;

  foreach v_mentor_id in array p_mentor_ids
  loop
    insert into application_mentors (application_id, mentor_id, status)
    values (v_application.id, v_mentor_id, 'pending');
  end loop;

  return v_application;
end;
$$;
