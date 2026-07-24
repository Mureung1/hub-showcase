-- Briefy 개발용 시드 데이터 (plan.md 최범규 페르소나 시나리오 기반)
-- Supabase 대시보드 → SQL Editor에 그대로 붙여넣고 실행하세요.
-- 모든 날짜는 실행 시점의 "오늘"(Asia/Seoul) 기준 상대값이다 — 언제 실행해도 오늘 날짜 데이터가 채워진다.
-- CTE로 한 번에 묶지 않고 각 INSERT의 VALUES 안에 상대 날짜 계산식을 직접 넣는다
-- (CTE 체이닝은 이전에 Supabase SQL Editor에서 타입 추론 문제를 일으킨 적이 있어 이 방식이 더 안전하다).
-- 전제: 7개 테이블이 비어 있는 상태. 이미 데이터가 있다면 title 조회로 참조하는 아래
-- routine_logs/reminders insert가 여러 행에 매칭될 수 있으니 먼저 비우고 실행할 것.

insert into schedules (title, date, start_time, end_time, raw_input) values
  ('치과', (now() at time zone 'Asia/Seoul')::date, '15:00', null, '오늘 3시 치과 예약'),
  ('대외활동 정기 모임', (now() at time zone 'Asia/Seoul')::date, '19:00', '21:00', '오늘 저녁 7시 대외활동 정기모임'),
  ('팀플 회의', (now() at time zone 'Asia/Seoul')::date + 7, '15:00', null, '다음주 화요일 오후 3시 팀플 회의, 전날 알려줘');

insert into tasks (title, deadline, completed, raw_input) values
  ('데이터베이스 과제 제출', (now() at time zone 'Asia/Seoul')::date + 3, false, '금요일까지 데이터베이스 과제 제출'),
  ('알고리즘 과제 제출', (now() at time zone 'Asia/Seoul')::date + 2, false, '알고리즘 과제 목요일까지'),
  ('공모전 서류 제출', (now() at time zone 'Asia/Seoul')::date + 2, false, '공모전 서류 제출 이틀 남음'),
  ('소프트웨어공학 팀플 보고서', (now() at time zone 'Asia/Seoul')::date + 9, false, '소프트웨어공학 팀플 보고서 다음주까지');

-- 2분할: 푸시업/스쿼트만 (러닝은 뺐다)
insert into routines (title, content, start_time, end_time, repeat_rule, raw_input) values
  ('상체 운동', '푸시업 50 * 4', '20:00', '22:00', '2split', '상체 하체 번갈아 운동 20시부터 22시까지'),
  ('하체 운동', '스쿼트 50 * 4', '20:00', '22:00', '2split', '상체 하체 번갈아 운동 20시부터 22시까지');

insert into meals (date, breakfast, lunch, dinner, raw_input) values
  ((now() at time zone 'Asia/Seoul')::date, '오트밀, 바나나', '잡곡밥, 닭가슴살, 브로콜리', '삶은 달걀 3개, 샐러드', '오늘 아침은 오트밀에 바나나, 점심 잡곡밥 닭가슴살, 저녁은 삶은달걀 3개랑 샐러드');

insert into memos (content, raw_input) values
  ('아이패드 케이스 새로 사기', '아이패드 케이스 새로 사기'),
  ('여름방학 인턴십 지원 알아보기', '여름방학 인턴십 지원 알아보기');

-- 하체 운동을 어제 완료 처리 → 오늘 브리핑에서는 상체 day 차례가 되도록
insert into routine_logs (routine_id, date, completed, raw_input)
select id, (now() at time zone 'Asia/Seoul')::date - 1, true, '지난 운동 하체 day 완료'
from routines where title = '하체 운동';

insert into reminders (target_type, target_id, remind_at, raw_input)
select 'schedule', id, (((now() at time zone 'Asia/Seoul')::date + 6)::text || 'T09:00:00+09:00')::timestamptz, '다음주 화요일 오후 3시 팀플 회의, 전날 알려줘'
from schedules where title = '팀플 회의'
union all
select 'task', id, (((now() at time zone 'Asia/Seoul')::date + 1)::text || 'T09:00:00+09:00')::timestamptz, '공모전 서류 제출 전날 알려줘'
from tasks where title = '공모전 서류 제출';
