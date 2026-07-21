-- Briefy 개발용 시드 데이터 (plan.md 최범규 페르소나 시나리오 기반)
-- Supabase 대시보드 → SQL Editor에 그대로 붙여넣고 실행하세요.
-- 전제: 7개 테이블이 비어 있는 상태 (0001_init.sql 적용 직후). 이미 데이터가 있다면 title 조회로
-- 참조하는 아래 routine_logs/reminders insert가 여러 행에 매칭될 수 있으니 먼저 비우고 실행할 것.

insert into schedules (title, date, start_time, end_time, raw_input) values
  ('치과', '2026-07-21', '15:00', null, '오늘 3시 치과 예약'),
  ('대외활동 정기 모임', '2026-07-21', '19:00', '21:00', '오늘 저녁 7시 대외활동 정기모임'),
  ('팀플 회의', '2026-07-28', '15:00', null, '다음주 화요일 오후 3시 팀플 회의, 전날 알려줘');

insert into tasks (title, deadline, completed, raw_input) values
  ('데이터베이스 과제 제출', '2026-07-24', false, '금요일까지 데이터베이스 과제 제출'),
  ('알고리즘 과제 제출', '2026-07-23', false, '알고리즘 과제 목요일까지'),
  ('공모전 서류 제출', '2026-07-23', false, '공모전 서류 제출 이틀 남음'),
  ('소프트웨어공학 팀플 보고서', '2026-07-30', false, '소프트웨어공학 팀플 보고서 다음주까지');

insert into routines (title, content, start_time, end_time, repeat_rule, raw_input) values
  ('상체 운동', '벤치프레스 5x5, 숄더프레스 3x10, 렛풀다운 3x12', '20:00', '22:00', '2split', '상체 하체 번갈아 운동 20시부터 22시까지'),
  ('하체 운동', '스쿼트 5x5, 레그프레스 3x10, 런지 3x12', '20:00', '22:00', '2split', '상체 하체 번갈아 운동 20시부터 22시까지'),
  ('러닝', '러닝 3km', null, null, 'weekly:mon,wed,fri', '월수금 러닝 3km');

insert into meals (date, breakfast, lunch, dinner, raw_input) values
  ('2026-07-21', null, '잡곡밥, 닭가슴살, 브로콜리', '삶은 달걀 3개, 샐러드', '오늘 점심 잡곡밥 닭가슴살, 저녁은 삶은달걀 3개랑 샐러드');

insert into memos (content, raw_input) values
  ('아이패드 케이스 새로 사기', '아이패드 케이스 새로 사기'),
  ('여름방학 인턴십 지원 알아보기', '여름방학 인턴십 지원 알아보기');

-- 하체 운동을 이틀 전 완료 처리 → 오늘 브리핑에서는 상체 day 차례가 되도록
insert into routine_logs (routine_id, date, completed, raw_input)
select id, '2026-07-19', true, '지난 운동 하체 day 완료'
from routines where title = '하체 운동';

insert into reminders (target_type, target_id, remind_at, raw_input)
select 'schedule', id, '2026-07-27T09:00:00+09:00'::timestamptz, '다음주 화요일 오후 3시 팀플 회의, 전날 알려줘'
from schedules where title = '팀플 회의'
union all
select 'task', id, '2026-07-22T09:00:00+09:00'::timestamptz, '공모전 서류 제출 전날 알려줘'
from tasks where title = '공모전 서류 제출';
