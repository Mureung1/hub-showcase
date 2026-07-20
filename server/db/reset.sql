-- Supabase 서버 전체 초기화 스크립트
-- 스키마(테이블/컬럼/RLS)는 그대로 두고 데이터만 모두 비운다.
-- 실행: Supabase 대시보드 SQL Editor에 붙여넣고 실행 (또는 psql -f server/db/reset.sql)
-- 주의: 모든 데이터가 삭제된다. 운영 DB에서는 실행하지 말 것.
-- 스키마 변경(컬럼 추가 등)은 이 스크립트가 아니라 db/migrations를 순서대로 적용할 것.

truncate table
  public.responses,
  public.participants,
  public.appointments
cascade;
