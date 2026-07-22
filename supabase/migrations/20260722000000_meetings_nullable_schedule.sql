-- meetings.scheduled_at / meetings.place를 nullable로 변경
-- 기준 문서: docs/api.md (6.3 신청 수락, 7. 면담 API), docs/db-schema.md (4.7 meetings)
-- 신청 수락 시점에 scheduled_at, place가 빈 값인 meetings 행이 자동 생성되고,
-- 이후 확정 멘토가 PATCH /api/meetings/:meetingId로 값을 채우기 때문에 NOT NULL 제약을 제거한다.

alter table meetings
  alter column scheduled_at drop not null,
  alter column place drop not null;
