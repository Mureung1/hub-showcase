# Implementation Plan: 서바이벌 스터디 챌린지 (Survival Study Challenge)

## Overview

이 계획은 개정된 설계(Drizzle-first, Next.js 앱 중심 아키텍처)를 점진적 구현 단계로 분해한다. 본 스펙은 **데이터 계층 + 서버 측 도메인 로직 계층**만 다룬다. Next.js UI(페이지·컴포넌트·인증 페이지·Realtime UI·Storage 업로드 UI·Vercel Cron/webhook 라우트 연결)는 별도 스펙 **"survival-study-web"** 에서 다루므로 여기에 포함하지 않는다.

구현 순서는 무결성의 최후 방어선을 먼저 세우는 방향으로 쌓는다: (1) 기존 손작성 SQL 자산 정리 및 Drizzle 데이터 계층 설정 → (2) Drizzle 스키마(모든 열거형·테이블·CHECK/UNIQUE/FK·인덱스) + 마이그레이션 + 얇은 raw SQL(pgcrypto·트리거·RLS·Storage·뷰) → (3) 포인트 시스템 트랜잭션 함수(무결성 기반) → (4) 챌린지 개설/참가 → (5) 인증 → (6) 탈락 → (7) 정산 → (8) 게임화 read model·초대 보상 → (9) 통합 테스트.

모든 쓰기(금전·포인트·상태 전이)는 **Drizzle 트랜잭션 함수**(`db.transaction()` + `SELECT ... FOR UPDATE`)로 구현하고, DB 선언적 제약(CHECK/UNIQUE/FK)이 이를 backstop한다. property-based test는 TypeScript `fast-check` 로, 통합 테스트는 원격 Supabase의 실 Postgres를 대상으로 Vitest로 작성한다(기존 pgTAP DB 테스트는 Vitest 통합 테스트로 대체).

**DB 실행 모드 (원격 전용, remote-only)**: 현재는 Docker/로컬 Supabase 스택을 사용하지 않고 원격 Supabase 프로젝트(`ybcdofrrrynivplijbww.supabase.co`)에 직접 연결해 개발한다. 원격에 보존해야 할 데이터는 없다. property/integration 테스트도 이 원격 Postgres(또는 원격의 전용 테스트 스키마)를 대상으로 실행한다. 이는 **"현재로서는"의 선택**이며, 이후 필요하면 로컬 Docker 워크플로(`supabase start` + `supabase db reset`)로 다시 전환할 수 있다. 원격 전용 모드에서는 원격 DB 연결 문자열/비밀번호가 필요하며(현재 `.env.local` 에 없음), 사용자가 이를 제공해야 한다.

`*` 로 표시된 하위 작업은 테스트 관련 선택 작업이며 MVP에서 건너뛸 수 있다.

## Tasks

- [x] 1. 기존 자산 정리 및 Drizzle 데이터 계층 설정
  - [x] 1.1 기존 손작성 SQL 마이그레이션 및 pg_cron 제거
    - `supabase/migrations/20250101000001_create_enums.sql` ~ `20250101000005_create_auxiliary_tables.sql` 및 `20250101000006_create_point_rpc.sql`(debit_points/credit_points RPC) 삭제
    - `pg_cron` 확장 활성화 및 `cron.schedule` 사용 제거(스케줄은 별도 web 스펙의 Vercel Cron으로 대체)
    - `pgcrypto` 확장과 `handle_new_user` 트리거는 삭제하지 말고 얇은 raw SQL 마이그레이션으로 보존(Task 2.7). 삭제되는 SQL 파일들은 Drizzle 스키마의 참조 "정답지"로 활용 후 제거
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 1.2 Drizzle ORM · drizzle-kit · Postgres 드라이버 설치 및 연결 구성
    - `drizzle-orm`, `drizzle-kit`, 직접 Postgres 드라이버(`postgres` 또는 `pg`) 설치
    - `drizzle.config.ts` 작성(스키마 경로·마이그레이션 출력 디렉터리·direct connection 지정)
    - 연결 문자열 분리 구성: 쓰기/트랜잭션 경로는 SESSION 모드 풀러, 마이그레이션은 direct connection. `.env.example` 에 필요한 환경변수 키 추가
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 1.3 테스트 환경 구성 (Vitest + fast-check, 로컬 Supabase 대상)
    - `fast-check` 를 이용한 property-based test 및 실 Postgres 대상 통합 테스트 러너 구성(로컬 Supabase `supabase start`)
    - 테스트용 Drizzle 클라이언트 헬퍼와 트랜잭션 격리/초기화(reset) 유틸 작성
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 1.4 원격 전용(remote-only) 모드 연결 구성 및 연결 검증
    - Drizzle 연결 환경변수를 원격 Supabase 프로젝트(`ybcdofrrrynivplijbww.supabase.co`)로 지정: 쓰기/트랜잭션 경로는 원격 SESSION 모드 풀러 연결 문자열(`DATABASE_SESSION_POOL_URL`), 마이그레이션 경로는 원격 direct connection 연결 문자열(`DATABASE_DIRECT_URL`)을 `.env.local` 에 설정
    - 설정 후 간단한 연결 검증(예: `SELECT 1` 및 스키마 조회)으로 원격 접속이 정상인지 확인
    - **이 작업은 원격 DB 연결 문자열/비밀번호가 필요하며(현재 `.env.local` 에 없음), 사용자가 이를 제공해야 한다.** 원격 전용 모드에서는 로컬 `supabase db reset` 을 수행하지 않는다(향후 로컬 Docker 워크플로로 전환 시 재도입 가능). Drizzle 스키마 적용(Task 2.6, 2.10) 이전에 수행
    - _Requirements: 14.1, 14.2, 14.3_

- [ ] 2. Drizzle 스키마 및 마이그레이션 (데이터 계층)
  - [x] 2.1 열거형 및 계정/지갑 스키마 정의
    - `pgEnum`: `challenge_kind`, `challenge_status`, `visibility_scope`, `survival_status`, `deposit_kind`, `verification_state`, `payment_status`, `point_txn_type`
    - `profiles`(email UNIQUE, invited_by 자기참조 FK, role), `point_wallets`(user_id UNIQUE, `wallet_non_negative` CHECK) 테이블 정의
    - _Requirements: 1.1, 1.2, 4.1, 8.1, 14.2_

  - [x] 2.2 challenges 스키마 및 종류별 정합성 제약 정의
    - `challenges` 테이블(kind, status, visibility, 기간/일일학습시간/마감시각/timezone, capacity/participant_count, deposit_kind, entry_amount, service_fee_rate, distribution_rule jsonb, no_winner_policy)
    - `valid_dates`, `valid_capacity`, `valid_amount`, `kind_deposit_consistency` CHECK 및 `idx_challenges_open` 부분 인덱스 정의
    - _Requirements: 2.1, 2.2, 4.1, 4.4, 4.5_

  - [x] 2.3 participations 스키마 및 중복/탈락 정합성 제약 정의
    - `participations` 테이블(survival_status, deposit_kind, deposit_amount, current_streak, eliminated_on)
    - `uq_participation` UNIQUE(challenge_id, user_id), `deposit_non_negative`·`elim_date_consistency` CHECK, `idx_part_challenge` 인덱스 정의
    - _Requirements: 3.1, 3.3, 5.1, 5.4, 8.1_

  - [x] 2.4 인증/결제/포인트 원장 스키마 정의
    - `daily_verifications`(uq_daily, accumulated_seconds `accum_non_negative`, study_goal_met, state, evidence_path, `idx_dv_date_state`)
    - `payment_transactions`(direction·amount CHECK, external_ref UNIQUE, status)
    - `point_transactions`(txn_type, 부호 있는 amount, balance_after `balance_after_non_negative` CHECK, `idx_pt_user`)
    - _Requirements: 3.5, 6.1, 6.3, 7.4, 11.5, 12.3, 12.5, 14.2_

  - [x] 2.5 정산/게임화 부속 스키마 정의
    - `reward_pools`(challenge_id UNIQUE, total_deposit·pool_amount·service_fee, `pool_non_negative`), `settlements`(refund/reward `settle_non_negative`)
    - `badges`(uq_badge), `revival_tickets`(point_cost CHECK, used), `surprise_missions`, `learning_reports`(participation_id UNIQUE) 테이블 정의
    - _Requirements: 9.3, 10.4, 12.4, 13.3, 13.4, 14.1_

  - [x] 2.6 drizzle-kit 마이그레이션 생성 및 원격 적용
    - `drizzle-kit generate` 로 SQL 마이그레이션 생성 후, 원격 direct connection(`DATABASE_DIRECT_URL`)으로 **원격 Supabase Postgres**(`ybcdofrrrynivplijbww.supabase.co`)에 적용
    - 생성된 스키마가 참조 "정답지"(삭제된 손작성 SQL)와 열/제약/인덱스 수준에서 일치하는지 대조
    - _Requirements: 14.1, 14.2_

  - [-] 2.7 얇은 raw SQL 마이그레이션: pgcrypto 확장 + handle_new_user 트리거
    - `extensions` 스키마에 `pgcrypto`(`gen_random_uuid`) 확장 생성
    - `auth.users` INSERT 시 `profiles` + 잔액 0 `point_wallets` 를 원자적으로 프로비저닝하는 `handle_new_user()` 함수와 `on_auth_user_created` 트리거 작성(유일하게 허용된 트리거), `invited_by` 메타데이터 반영
    - _Requirements: 1.1, 11.4_

  - [ ] 2.8 raw SQL: RLS 정책 + Storage 버킷/정책 + v_leaderboard 뷰
    - deny-by-default RLS: 공개 챌린지 목록/상세, 리더보드/진행현황 read model, 본인 지갑·본인 원장·본인 인증 레코드에만 SELECT 정책 부여. 지갑/원장/정산/참가/인증 테이블은 클라이언트 쓰기 정책 없음(거부)
    - 비공개 `evidence` Storage 버킷 생성 및 `{user_id}/{challenge_id}/{date}` 본인 폴더 read/write 정책
    - `v_leaderboard` read model 뷰(survival_status, current_streak 순위, alive_count) 생성
    - _Requirements: 1.5, 2.1, 7.1, 13.1, 13.2, 14.2_

  - [ ] 2.9 스키마 선언적 제약 통합 테스트
    - 원격 전용 모드: 원격 Postgres(또는 원격의 전용 테스트 스키마)를 대상으로 실행
    - **Property 11: 중복 참가 불변** — `uq_participation` 이 동일 (challenge, user) 재삽입을 거부하는지 검증
    - **Property 13: 챌린지 종류-예치 정합성** — `kind_deposit_consistency` 가 잘못된 kind/deposit_kind 조합을 거부하는지 검증
    - 지갑 음수 잔액·balance_after 음수·capacity 초과·uq_daily·external_ref UNIQUE 위반 거부, 신규 계정 시 지갑 자동 생성 검증
    - **Validates: Requirements 3.3, 4.4, 5.4, 1.1, 14.2**

  - [ ] 2.10 신규 스키마를 원격 DB에 적용 및 검증 (원격 전용)
    - 이전에 구(舊) 손작성 스키마가 이미 푸시된 원격 Supabase 프로젝트(`ybcdofrrrynivplijbww.supabase.co`)를 초기화 — public 스키마의 구 오브젝트 및 기존에 푸시된 구 Supabase 마이그레이션 히스토리를 드롭 — 후 신규 Drizzle 스키마(2.6) + 얇은 raw SQL(2.7 pgcrypto+`handle_new_user` 트리거, 2.8 RLS·Storage 버킷/정책·`v_leaderboard` 뷰)을 원격에 적용
    - **파괴적(destructive) 작업**이며 원격 DB 연결 문자열/자격 증명(현재 `.env.local` 에 없음)이 필요하고, 실행 전 명시적 확인이 요구됨(보존 대상 데이터 없음 확인됨)
    - 적용된 스키마(열/제약/인덱스/열거형)가 Drizzle 정의와 일치하는지 원격에서 검증
    - _Requirements: 14.1, 14.2, 14.3_

- [ ] 3. 포인트 시스템 트랜잭션 함수 (무결성 기반)
  - [ ] 3.1 debitPoints / creditPoints 구현
    - 상위 트랜잭션 핸들(`tx`)을 주입받아 지갑 행 `FOR UPDATE` 잠금 → 잔액 검증 → `point_wallets` UPDATE + `point_transactions` append-only 원장 INSERT를 동일 트랜잭션에서 원자적으로 수행
    - 음수 금액 거부, 잔액 부족 시 `INSUFFICIENT_POINTS` throw → 롤백. `getWalletBalance`/`getTransactionHistory` 읽기 함수 포함
    - _Requirements: 5.1, 11.1, 11.2, 11.3, 11.5, 12.1, 12.2, 12.5, 14.2, 14.3_

  - [ ] 3.2 포인트 보존 property test 작성
    - **Property 1: 포인트 보존** — 임의의 적립/차감 시퀀스 후 최종 잔액 == 초기 + Σ적립 − Σ차감, 모든 중간 시점 잔액 >= 0, 연산마다 정확히 1개 원장 행
    - **Validates: Requirements 5.1, 11.5, 12.1, 12.5, 14.2**

  - [ ] 3.3 차감 원자성 property test 작성
    - **Property 2: 차감 원자성 (롤백 불변)** — 잔액 초과 차감 또는 트랜잭션 도중 오류 시 지갑/관련 상태가 거래 이전과 완전히 동일하게 유지됨(전부 아니면 전무)
    - **Validates: Requirements 5.2, 12.2, 14.3**

  - [ ] 3.4 포인트 함수 단위 테스트
    - 정상 적립/차감, 음수 금액 거부, 지갑 없음 예외, balance_after 원장 정확성, tx 주입 시 상위 트랜잭션 롤백 전파 검증
    - _Requirements: 11.5, 12.2, 12.5_

- [ ] 4. 챌린지 개설/참가 도메인 함수
  - [ ] 4.1 createUserChallenge 구현
    - Host 권한 및 필수 설정 검증(누락 시 `INVALID_CONFIG`와 항목 명시), 허용 범위 검증, `kind='user'`/`deposit_kind='point'`/`host_id` 강제, 공개 범위 반영, `reward_pools` 초기화
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 4.2 joinUserChallenge 구현
    - `challenges` `FOR UPDATE`(모집 인원) + 지갑 `FOR UPDATE` 잠금, 모집 상태/인원/중복 확인, `debitPoints` 로 포인트 예치, `participations` INSERT, `participant_count` 증가, `reward_pools.total_deposit` 갱신을 단일 트랜잭션으로 처리
    - 잔액 부족/모집 마감/중복 참가 시 롤백
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 14.3_

  - [ ] 4.3 joinOfficialChallenge 및 handlePaymentWebhook 구현
    - webhook 서명 검증 후 승인 시 `joinOfficialChallenge` 트랜잭션 트리거: `challenges` `FOR UPDATE`, 모집 인원/중복 확인, `participations` INSERT, `payment_transactions` 기록
    - `external_ref` UNIQUE 기반 멱등 처리(중복 webhook 무시), 결제 실패 시 참가 미완료(`PAYMENT_DECLINED`), 포인트 할인(entry_discount) 반영
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 12.3_

  - [ ] 4.4 챌린지 종류-예치 정합성 property test 작성
    - **Property 13: 챌린지 종류-예치 정합성** — 생성되는 챌린지가 kind='user'→point+host, kind='official'→cash를 항상 만족
    - **Validates: Requirements 4.4**

  - [ ] 4.5 중복 참가 불변 property test 작성
    - **Property 11: 중복 참가 불변** — 임의의 참가 요청 시퀀스에서 동일 (challenge_id, user_id) 참가 행은 최대 1개
    - **Validates: Requirements 3.3, 5.4**

  - [ ] 4.6 모집 인원 상한 property test 작성
    - **Property 12: 모집 인원 상한** — 병렬 트랜잭션 인터리빙 하에서도 `participant_count <= capacity` 항상 유지(`FOR UPDATE` 잠금 검증)
    - **Validates: Requirements 3.4, 5.3**

  - [ ] 4.7 결제 webhook 멱등성 property test 작성
    - **Property 14: 결제 webhook 멱등성** — 동일 `external_ref` 반복 수신 시 `payment_transactions` 행 최대 1개, 참가 최대 1회 등록
    - **Validates: Requirements 3.5, 3.1**

  - [ ] 4.8 챌린지 개설/참가 단위 테스트
    - 필수 항목 누락/범위 초과 오류, 현금 참가비 거부, 공개 목록 노출, 잔액 부족/모집 마감/중복 거부, 결제 거부 경로 검증
    - _Requirements: 4.2, 4.3, 4.5, 3.2, 5.2, 5.3_

- [ ] 5. 체크포인트 - 데이터 계층·포인트·참가 흐름 테스트 통과 확인
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. 인증 도메인 함수 (일일 목표·타이머·생존 인증)
  - [ ] 6.1 submitDailyGoal 및 recordTimerSession 구현
    - `submitDailyGoal`(날짜별 목표 기록, uq_daily upsert), `recordTimerSession`(세션 경과 누적 → `accumulated_seconds` 갱신, 일일 요구시간 도달 시 `study_goal_met=true`)
    - 누적 초 음수 방지(`accum_non_negative`)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 6.2 submitVerification 구현 (게이팅)
    - `participation` `FOR UPDATE` 잠금, 세 조건 게이팅: `study_goal_met==true` ∧ 회고·evidence 제출됨 ∧ `now() <= verification_deadline` ∧ `survival_status='alive'`
    - 충족 시 `state='completed'` 기록(uq_daily), 미달/마감초과/탈락 시 각각 `STUDY_TIME_NOT_MET`/`DEADLINE_EXCEEDED`/`NOT_ALIVE` 거부
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.3_

  - [ ] 6.3 인증 성공 시 보상 포인트 적립 연동
    - 동일 트랜잭션에서 `creditPoints` 로 회고 작성 보상·Streak 도달 보상 적립, `current_streak` 갱신
    - _Requirements: 11.2, 11.3, 11.5_

  - [ ] 6.4 타이머 누적 정합성 property test 작성
    - **Property 10: 타이머 누적 정합성** — `accumulated_seconds` == 기록된 세션 경과 시간의 합, 요구시간 도달 시에만 `study_goal_met` true
    - **Validates: Requirements 6.3, 6.4**

  - [ ] 6.5 인증 게이팅 property test 작성
    - **Property 9: 인증 게이팅** — 인증 완료(`state='completed'`)는 세 조건이 모두 참일 때만 생성됨
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [ ] 6.6 탈락 후 인증 불가 property test 작성
    - **Property 8: 탈락 후 인증 불가** — `eliminated` 상태에서 제출된 모든 인증은 `NOT_ALIVE` 로 거부됨
    - **Validates: Requirements 8.3**

  - [ ] 6.7 인증 흐름 단위 테스트
    - 학습시간 미달/마감 초과/탈락 거부, 정상 인증 완료 기록, 타이머 누적 갱신, 보상 적립 연동 검증
    - _Requirements: 6.4, 7.1, 7.2, 7.3, 7.4, 11.2, 11.3_

- [ ] 7. 일일 탈락 처리 및 부활권
  - [ ] 7.1 processDailyEliminations 구현
    - 각 챌린지 `timezone` 기준 마감 경과 + 당일 미인증 + `alive` 참가자를 `FOR UPDATE` 로 잠그고 `eliminated`(+`eliminated_on`)로 전이
    - deposit을 `reward_pools.pool_amount` 에 편입, 놓친 날짜를 `daily_verifications.state='missed'` 로 upsert. 보호된 Route Handler에서 호출될 진입점 계약 정의
    - _Requirements: 7.4, 8.1, 8.2_

  - [ ] 7.2 부활권 구매/사용 구현
    - `debitPoints` 로 부활권 비용 차감, `revival_tickets` 기록, `survival_status` 를 `alive` 로 복원, 이미 pool에 편입된 deposit에 대한 재예치 정책 반영
    - _Requirements: 12.4, 12.5_

  - [ ] 7.3 탈락 완전성 property test 작성
    - **Property 6: 탈락 완전성** — 실행 후 (alive ∧ 마감경과 ∧ 당일 미인증)인 참가자가 존재하지 않음
    - **Validates: Requirements 8.1**

  - [ ] 7.4 탈락 예치금 pool 보존 property test 작성
    - **Property 7: 탈락 예치금의 Reward_Pool 보존** — `pool_amount` 증가분 == 이번에 탈락한 참가자 deposit 합과 정확히 일치
    - **Validates: Requirements 8.2**

  - [ ] 7.5 생존 상태 전이 단조성 property test 작성
    - **Property 5: 생존 상태 전이 단조성** — 전이는 alive→eliminated 또는 alive→completed로만(부활권 eliminated→alive 예외), eliminated→completed 직접 전이 불가, 최종일 alive는 모두 completed
    - **Validates: Requirements 8.4, 12.4**

  - [ ] 7.6 탈락/부활 단위 테스트
    - 마감 경과 미인증자 탈락, 인증 완료자 생존 유지, deposit의 pool 편입 금액 정확성, 부활권 잔액 부족 거부·상태 복원 검증
    - _Requirements: 8.1, 8.2, 12.4_

- [ ] 8. 체크포인트 - 인증 및 탈락 흐름 테스트 통과 확인
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. 종료 정산 및 보상 분배
  - [ ] 9.1 settleChallenge 구현 (완주자 확정 + 분배 + 보존식 검증)
    - `challenges` `FOR UPDATE`, 최종일 `alive` → `completed` 확정(Req 8.4), Σ전체 예치·Σ탈락자 예치·Service_Fee 산정
    - 완주자별 Refund(본인 deposit) + 추가 보상(균등/`distribution_rule` 기반) 분배, `settlements` 기록. 포인트는 `creditPoints`, 현금은 `payment_transactions` refund 큐잉. 완주자 없음(`no_winner_policy`) 처리, 재정산 방지(`ALREADY_SETTLED`)
    - 커밋 직전 보존식 검증: `round(Σ(refund+reward) + service_fee) == round(Σ deposit)`, 불일치 시 `CONSERVATION_VIOLATED` throw → 전체 롤백. 보상 총액이 `pool_amount - service_fee` 초과 금지
    - _Requirements: 8.4, 9.1, 9.2, 9.4, 10.1, 10.2, 10.3, 14.1_

  - [ ] 9.2 완주 배지·학습 리포트·완주 보상 포인트 지급
    - `settleChallenge` 내에서 완주자에게 `badges`(completion, uq_badge onConflictDoNothing) 및 `learning_reports`(집계 데이터) 지급, 완주 보상 포인트 `creditPoints`(challenge_complete) 적립
    - _Requirements: 9.3, 10.4, 11.1_

  - [ ] 9.3 정산 보존식 property test 작성
    - **Property 3: 정산 보존식** — 임의의 (완주자, 탈락자) 구성에서 Σrefund + Σreward + service_fee == Σdeposit
    - **Validates: Requirements 9.1, 9.2, 10.1, 14.1**

  - [ ] 9.4 보상 상한 property test 작성
    - **Property 4: 보상 상한** — 완주자 추가 보상 총액 <= `pool_amount - service_fee`
    - **Validates: Requirements 9.4, 10.2**

  - [ ] 9.5 정산 단위 테스트
    - 완주자 다수/단독/없음 케이스, 재정산 거부, 현금/포인트 분배 경로, 보존식 위반 시 롤백, 배지/리포트 지급 검증
    - _Requirements: 8.4, 9.1, 9.2, 9.3, 10.1, 10.3, 10.4_

- [ ] 10. 게임화 read model 및 초대 보상
  - [ ] 10.1 리더보드/진행현황 read model 함수 구현
    - `v_leaderboard` 기반 순위/생존자 수 조회, 본인 진행 현황(survival_status, current_streak, 남은 기간) read model 함수(읽기 전용) 작성
    - _Requirements: 13.1, 13.2_

  - [ ] 10.2 Surprise_Mission 발행 및 배지 조회 구현
    - Operator 권한(`profiles.role='operator'`) 검증 후 `surprise_missions` INSERT 도메인 함수, 사용자 프로필 `badges` 조회 함수 작성
    - _Requirements: 13.3, 13.4_

  - [ ] 10.3 친구 초대 보상 적립 연동 구현
    - `handle_new_user` 로 설정된 `invited_by` 를 근거로 초대자에게 `creditPoints`(invite_bonus) 적립 및 원장 기록하는 도메인 함수 작성
    - _Requirements: 11.4, 11.5_

  - [ ] 10.4 게임화·초대 보상 단위 테스트
    - 리더보드 순위/생존자 수 정확성, Operator 외 미션 발행 거부, 배지 노출, 초대 링크 가입 시 초대자 잔액 증가·원장 사유 기록 검증
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 11.4, 11.5_

- [ ] 11. 통합 및 시나리오 테스트
  - [ ] 11.1 엔드투엔드 챌린지 라이프사이클 통합 테스트
    - 로컬 Supabase에서 참가 → 매일 인증/일부 탈락 → 종료 정산 전체 흐름 재현, 최종 보존식 및 상태 전이 검증
    - _Requirements: 8.4, 9.1, 10.1, 14.1_

  - [ ] 11.2 동시성 및 멱등성 통합 테스트
    - 동시 참가 부하로 모집 인원 상한(Property 12)·지갑 경합(Property 1) 검증, 결제 webhook 중복 호출 멱등성(Property 14) 검증
    - _Requirements: 3.4, 3.5, 5.3, 14.2_

  - [ ] 11.3 인증 계층·Storage·RLS·Cron 통합 테스트
    - Supabase Auth 세션 생성/실패(Req 1.3, 1.4)·미인증 거부(Req 1.5), evidence 본인 폴더 RLS, 클라이언트의 지갑/원장/정산 직접 쓰기 차단, Cron Route Handler → `processDailyEliminations` 시크릿 검증 경로 확인
    - _Requirements: 1.3, 1.4, 1.5, 7.1, 8.1, 14.2_

- [ ] 12. 최종 체크포인트 - 전체 테스트 통과 확인
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` 로 표시된 작업은 선택 사항(테스트)이며 빠른 MVP를 위해 건너뛸 수 있다.
- 각 작업은 추적성을 위해 특정 요구사항 조항을 참조한다.
- 체크포인트는 점진적 검증을 보장한다.
- Property test는 설계의 Correctness Properties(1~14) 불변식을 `fast-check` 로 검증하며, 특히 포인트 보존/차감 원자성(#1, #2)과 정산 보존식/보상 상한(#3, #4)에 집중한다.
- 현재는 **원격 전용(remote-only) 모드**로, 로컬 Docker/Supabase 스택 없이 원격 Supabase 프로젝트(`ybcdofrrrynivplijbww.supabase.co`)에 직접 연결해 개발한다. property/integration 테스트도 이 원격 Postgres(또는 원격의 전용 테스트 스키마)를 대상으로 실행한다. 이는 "현재로서는"의 선택이며 이후 로컬 Docker 워크플로(`supabase start` + `supabase db reset`)로 재전환 가능하다. 원격 연결에는 사용자가 제공해야 하는 원격 DB 연결 문자열/비밀번호가 필요하다.
- 단위·통합 테스트는 원격 Supabase의 실 Postgres를 대상으로 Drizzle 트랜잭션 함수를 호출하며, 개별 함수와 선언적 제약의 경계/오류 경로를 검증한다(기존 pgTAP를 Vitest 통합 테스트로 대체).
- 모든 쓰기는 Drizzle 트랜잭션 함수(`db.transaction()` + `FOR UPDATE`)로 구현하고, DB 선언적 제약(CHECK/UNIQUE/FK)이 최후 방어선으로 backstop한다. PL/pgSQL RPC와 pg_cron은 사용하지 않는다.
- 본 스펙은 데이터 계층 + 도메인 로직만 다룬다. UI·Server Action/Route Handler 라우팅·Realtime UI·Storage 업로드 UI·Vercel Cron 스케줄 연결은 별도 "survival-study-web" 스펙에서 본 함수들을 소비한다.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["1.4", "2.2", "2.3", "2.4", "2.5"] },
    { "id": 3, "tasks": ["2.6"] },
    { "id": 4, "tasks": ["2.7", "2.8"] },
    { "id": 5, "tasks": ["2.10"] },
    { "id": 6, "tasks": ["2.9", "3.1"] },
    { "id": 7, "tasks": ["3.2", "3.3", "3.4", "4.1"] },
    { "id": 8, "tasks": ["4.2", "4.3"] },
    { "id": 9, "tasks": ["4.4", "4.5", "4.6", "4.7", "4.8", "6.1"] },
    { "id": 10, "tasks": ["6.2"] },
    { "id": 11, "tasks": ["6.3", "7.1", "7.2"] },
    { "id": 12, "tasks": ["6.4", "6.5", "6.6", "6.7", "7.3", "7.4", "7.5", "7.6"] },
    { "id": 13, "tasks": ["9.1"] },
    { "id": 14, "tasks": ["9.2"] },
    { "id": 15, "tasks": ["9.3", "9.4", "9.5", "10.1", "10.2", "10.3"] },
    { "id": 16, "tasks": ["10.4", "11.1", "11.2", "11.3"] }
  ]
}
```
