-- application_mentors: 멘토 본인이 직접 거부한 것과, 다른 멘토 수락으로 자동 거부된 것을 구분
alter table application_mentors
  add column auto_rejected boolean not null default false;
