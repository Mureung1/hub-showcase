-- 0007: 투자 판단 "계획" 필드 + AI 복기 "거울 프레임" 전환
-- 근거: 서비스 재정의 논의 — 자본시장법 투자자문업/유사투자자문업 회피를 위해
--   AI 복기를 "매매 판단·추천"에서 "계획 대비 실행을 비추는 거울"로 전환한다.
--   (사후성: 이미 실행한 자기 매매의 기록 회고 / 결과론 평가 금지 / 미래 매매 지시 금지)
--
-- 배경:
--   1) 거울 프레임이 성립하려면 "계획"이 기록에 있어야 한다 — 목표가·손절가·가설이 없으면
--      복기는 "계획을 안 세웠다"는 사실 자체를 비출 수 있게 설계한다.
--   2) reviews.repeated_mistake는 '실수'라는 가치평가 단어가 내장돼 있어 behavior_pattern으로
--      의미를 재정의한다(사실 서술: 반복되는 행동 패턴). plan_adherence(계획 대비 실행)를 신설한다.

-- =========================================================
-- 1) 매매 기록 확장: 진입 계획 필드 (전부 선택 입력)
-- =========================================================
alter table trades add column if not exists thesis text;
-- 진입 가설(왜 이 매매를 했는가) — 자유 텍스트, 선택 입력.

alter table trades add column if not exists target_price numeric;
-- 목표가 — 선택 입력.

alter table trades add column if not exists stop_price numeric;
-- 손절가 — 선택 입력.

alter table trades add column if not exists horizon text;
alter table trades drop constraint if exists trades_horizon_check;
alter table trades add constraint trades_horizon_check
  check (horizon is null or horizon in ('scalp','swing','mid','long'));
-- scalp(단타) · swing(스윙) · mid(중기) · long(장기)

alter table trades add column if not exists confidence smallint;
alter table trades drop constraint if exists trades_confidence_check;
alter table trades add constraint trades_confidence_check
  check (confidence is null or confidence between 1 and 5);
-- 확신도 1~5, 선택 입력.

-- =========================================================
-- 2) AI 복기 개편: 계획 대비 실행 축 신설 + '실수' 가치어 제거
-- =========================================================
alter table reviews add column if not exists plan_adherence text;
-- 계획(목표가·손절가·가설) 대비 실행 서술. 계획 미기록이면 그 사실 자체를 서술.

alter table reviews rename column repeated_mistake to behavior_pattern;
-- '반복 실수'(가치평가) → '행동 패턴'(사실 서술)로 의미 재정의. 컬럼명만 변경, 데이터는 유지.

-- 기존 RLS 정책(auth.uid() = user_id, 0001_schema.sql)은 컬럼 추가/rename에 영향받지 않음 — 재정의 불요.
