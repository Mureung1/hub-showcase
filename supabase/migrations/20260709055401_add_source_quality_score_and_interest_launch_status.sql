-- sources: 소스 자체 품질/유료 위험도
alter table sources
  add column source_quality_score numeric not null default 0.7,
  add column paywall_risk text not null default 'low'
    check (paywall_risk in ('low','medium','high'));

-- interests: 관심사별 노출 상태 관리
alter table interests
  add column launch_status text not null default 'active'
    check (launch_status in ('active','curated_only','hidden','preparing')),
  add column risk_level text not null default 'low'
    check (risk_level in ('low','medium','high')),
  add column empty_state_message text;

-- 시사이슈 / 사회문제는 수동 큐레이션 전용으로 전환
update interests
set launch_status = 'curated_only',
    risk_level = 'medium',
    empty_state_message = '시사이슈와 사회문제는 자극적인 글보다 생각해볼 만한 글을 선별해서 제공해요. 오늘 준비된 글이 없으면 다른 관심사의 글을 먼저 보여드릴게요.'
where name in ('시사이슈', '사회문제');
