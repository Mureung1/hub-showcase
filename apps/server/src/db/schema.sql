-- WeatherPilot DB 스키마 (Supabase / PostgreSQL)
-- 실행: Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.
-- 기획서 5개 테이블: stores · customers · daily_sales · campaigns · coupons
-- 모든 접근은 서버(service_role/secret 키) 경유. 각 테이블에 RLS를 켜되 정책은 두지 않아,
-- 외부 anon/publishable 키는 전면 차단하고 서버 secret 키만 RLS 우회로 접근한다.

-- 재실행 가능하도록 의존 역순으로 정리
drop table if exists coupons cascade;
drop table if exists campaigns cascade;
drop table if exists daily_sales cascade;
drop table if exists customers cascade;
drop table if exists stores cascade;

-- 매장
create table stores (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text,                       -- 업종 (카페·식당 등)
  menu_tags  text[] default '{}',        -- 대표 메뉴 태그
  tone       text,                       -- 문구 톤 (친근·정중 등)
  lat        double precision not null,  -- 위도
  lng        double precision not null,  -- 경도
  nx         integer not null,           -- 기상청 격자 X
  ny         integer not null,           -- 기상청 격자 Y
  created_at timestamptz not null default now()
);

-- 단골 (더미 데이터만 — 실개인정보 금지)
create table customers (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  name       text,
  phone      text,
  consent_at timestamptz,   -- 광고 수신동의 시각 (null이면 미동의)
  opt_out_at timestamptz,   -- 수신거부 시각 (있으면 발송 제외)
  created_at timestamptz not null default now()
);

create index customers_store_id_idx on customers(store_id);

-- 일매출 (수동 입력 / CSV 업로드) + 그날 날씨 스냅샷
--
-- 캠페인 발송 여부 컬럼은 일부러 두지 않는다. campaigns가 이미 (store_id, date, status)를
-- 갖고 있어 날짜로 맞추면 되고(db/queries.ts getSalesWithWeather), 그래야 지난 데이터도
-- 소급 판별된다. 진단은 발송일(status='sent')을 기준선에서 빼고 날씨 순효과만 잰다.
create table daily_sales (
  store_id         uuid not null references stores(id) on delete cascade,
  date             date not null,
  revenue          integer not null,     -- 원 단위
  weather_snapshot jsonb,                -- 그날 앙상블 날씨 (EnsembleWeather)
  created_at       timestamptz not null default now(),
  primary key (store_id, date)
);

-- 캠페인 (에이전트 제안 → 승인 → 발송)
create table campaigns (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  date        date not null,
  weather     jsonb,                     -- 생성 근거 날씨
  proposal    jsonb,                     -- LLM 제안 원본 (title·copy·promo·channels)
  edited_copy text,                      -- 사장님이 수정한 최종 문구
  channels    text[] default '{}',       -- 발송 채널
  status      text not null default 'draft'
              check (status in ('draft','approved','sent','scheduled')),
  created_at  timestamptz not null default now()
);

create index campaigns_store_date_idx on campaigns(store_id, date);

-- 쿠폰 (코드 발급 → 사용 추적 → 귀속 매출)
create table coupons (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  code         text not null unique,
  issued_to    uuid references customers(id) on delete set null,
  used_at      timestamptz,              -- 사용 시각 (null이면 미사용)
  order_amount integer,                  -- 사용 시 주문 금액 (귀속 매출)
  created_at   timestamptz not null default now()
);

create index coupons_campaign_id_idx on coupons(campaign_id);

-- RLS 활성화 (정책 없음).
-- 정책이 없으면 anon/publishable 키는 전면 차단되고, 서버 secret 키만 RLS를 우회해 접근한다.
alter table stores      enable row level security;
alter table customers   enable row level security;
alter table daily_sales enable row level security;
alter table campaigns   enable row level security;
alter table coupons     enable row level security;
