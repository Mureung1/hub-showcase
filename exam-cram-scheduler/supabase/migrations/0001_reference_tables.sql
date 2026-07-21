-- #14 "Supabase 프로젝트 생성 및 마이그레이션"
-- 컬럼 설계 출처: docs/spec.md 7번 (2026-07-15 확정)
-- 세 테이블 모두 참고용 정적 데이터만 저장한다. 사용자 스케줄/입력값은 저장하지 않음
-- (서비스_기술_지도.md 7.1 결정 배경 참고).

-- 1) 음료별 카페인 함량표
-- 컬럼: id, name, mg, icon, sort_order
create table if not exists caffeine_reference (
  id bigint generated always as identity primary key,
  name text not null,
  mg integer not null,
  icon text not null,
  sort_order integer not null
);

-- 2) 카페인 민감도 3단계별 반감기
-- 컬럼: id, sensitivity, half_life_hours
-- 근거: 기획서.md 6.2 (Vital-Lopez et al. 2024 반감기 범위 근사)
create table if not exists sensitivity_halflife (
  id bigint generated always as identity primary key,
  sensitivity text not null unique,
  half_life_hours numeric not null
);

-- 3) 연령/건강상태별 일일 카페인 안전 섭취 한도
-- 컬럼: id, condition_key, daily_limit_mg, mg_per_kg, note
-- 근거: dailyCaffeineLimit.ts(2주차 목요일 구현)와 동일한 기준
-- (12세 미만/12~19세/20세 이상 + 임신·심장질환·불안불면 공통 제한)
create table if not exists safety_limits (
  id bigint generated always as identity primary key,
  condition_key text not null unique,
  daily_limit_mg integer not null,
  mg_per_kg numeric,
  note text
);

-- 프로젝트 생성 시 "Automatically expose new tables"를 꺼뒀다면, RLS를 켜고
-- 누구나 읽을 수 있게(SELECT) 허용하는 규칙을 직접 만들어줘야 한다. 참고용 정적
-- 데이터라 개인정보가 아니므로 "전체 공개 읽기 허용"으로 충분하다. 쓰기(INSERT/
-- UPDATE/DELETE)는 허용하는 정책이 없으므로 anon/authenticated 키로는 불가능.
alter table caffeine_reference enable row level security;
alter table sensitivity_halflife enable row level security;
alter table safety_limits enable row level security;

create policy "Allow public read access" on caffeine_reference for select using (true);
create policy "Allow public read access" on sensitivity_halflife for select using (true);
create policy "Allow public read access" on safety_limits for select using (true);
