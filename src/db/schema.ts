/**
 * Drizzle schema — single source of truth for the data layer.
 *
 * `drizzle.config.ts` points its `schema` option at this file, so
 * `drizzle-kit generate` (Task 2.6) reads every export here and emits the SQL
 * migration. Match design.md → "Data Models" EXACTLY (column names, types,
 * defaults, CHECK/UNIQUE/FK constraints); the removed hand-written SQL
 * migrations serve only as the reference "answer key".
 *
 * Money columns use `numeric(14,2)` (cash); points use integer-unit `bigint`
 * (mode 'number'). Non-negativity / conservation invariants are enforced with
 * `check()` constraints — the DB-level last line of defence for resource
 * conservation (Requirement 14).
 *
 * Structure: sections are added incrementally by Task 2.
 *   - Task 2.1 (this task): ENUMs + profiles + point_wallets
 *   - Task 2.2: challenges
 *   - Task 2.3: participations
 *   - Task 2.4: daily_verifications / payment_transactions / point_transactions
 *   - Task 2.5: reward_pools / settlements / badges / revival_tickets /
 *               surprise_missions / learning_reports
 * Each later task appends its tables below, so keep additions self-contained.
 *
 * Design reference: design.md → "Data Models".
 * Requirements traceability: 1.1, 1.2, 4.1, 8.1, 14.2 (this task).
 */

import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  boolean,
  check,
  date,
  integer,
  time,
  numeric,
  jsonb,
  index,
  unique,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// 열거형 (ENUMs) — design.md → "Data Models" / "열거형(ENUM)"
// ---------------------------------------------------------------------------

export const challengeKind = pgEnum('challenge_kind', ['official', 'user']);
export const challengeStatus = pgEnum('challenge_status', [
  'recruiting',
  'in_progress',
  'ended',
  'settled',
  'cancelled',
]);
export const visibilityScope = pgEnum('visibility_scope', ['public', 'private']);
export const survivalStatus = pgEnum('survival_status', [
  'alive',
  'eliminated',
  'completed',
]);
export const depositKind = pgEnum('deposit_kind', ['cash', 'point']);
export const verificationState = pgEnum('verification_state', [
  'pending',
  'completed',
  'missed',
]);
export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'approved',
  'failed',
  'refunded',
]);
export const pointTxnType = pgEnum('point_txn_type', [
  'challenge_complete',
  'streak_bonus',
  'retrospective_bonus',
  'invite_bonus',
  'challenge_join',
  'challenge_create',
  'revival_purchase',
  'reward_distribution',
  'entry_discount',
  'refund_adjustment',
]);

// ---------------------------------------------------------------------------
// profiles (Requirement 1) — design.md → "Data Models" / "profiles"
//
// Public profile extending Supabase Auth's `auth.users`. The FK to
// `auth.users(id) ON DELETE CASCADE` and the `handle_new_user` provisioning
// trigger are applied via a thin raw-SQL migration in Task 2.7 (Drizzle cannot
// express a cross-schema FK to the `auth` schema), so `id` is defined here as a
// plain uuid primary key without the auth.users FK.
// ---------------------------------------------------------------------------

export const profiles = pgTable('profiles', {
  // FK → auth.users(id) ON DELETE CASCADE is added in raw SQL (Task 2.7).
  id: uuid('id').primaryKey(),
  displayName: text('display_name').notNull(),
  email: text('email').notNull().unique(), // Req 1.2 중복 방지
  invitedBy: uuid('invited_by').references((): AnyPgColumn => profiles.id), // Req 11.4
  role: text('role').notNull().default('user'), // 'user' | 'operator'
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// point_wallets (Requirement 1.1, 14.2) — design.md → "Data Models" /
// "point_wallets"
//
// One wallet per user. Balance can never go negative — the DB-level last line
// of defence for point conservation.
// ---------------------------------------------------------------------------

export const pointWallets = pgTable(
  'point_wallets',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`extensions.gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    balance: bigint('balance', { mode: 'number' }).notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    walletNonNegative: check('wallet_non_negative', sql`${t.balance} >= 0`), // Req 14.2
  }),
);

// ---------------------------------------------------------------------------
// challenges (Requirement 2, 4) — design.md → "Data Models" / "challenges"
//
// 공식/사용자 챌린지를 `kind` 로 구분하는 단일 타입-구분 테이블. `check` 로 종류별
// 필드 정합성을 강제한다:
//   - kind_deposit_consistency: User_Challenge=point(+host 필수),
//     Official_Challenge=cash (Req 4.4)
//   - valid_dates / valid_capacity / valid_amount: 기간·모집 인원·금액 정합성
// `idx_challenges_open` 부분 인덱스는 모집 중(status='recruiting') 챌린지 조회를
// 가속한다 (Req 2.1 공개 모집 목록).
// ---------------------------------------------------------------------------

export const challenges = pgTable(
  'challenges',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`extensions.gen_random_uuid()`),
    kind: challengeKind('kind').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    hostId: uuid('host_id').references(() => profiles.id), // User_Challenge Host, official은 NULL
    status: challengeStatus('status').notNull().default('recruiting'),
    visibility: visibilityScope('visibility').notNull().default('public'),

    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    dailyStudyMinutes: integer('daily_study_minutes').notNull(),
    verificationDeadlineTime: time('verification_deadline_time').notNull(),
    timezone: text('timezone').notNull().default('Asia/Seoul'),

    capacity: integer('capacity').notNull(),
    participantCount: integer('participant_count').notNull().default(0),

    depositKind: depositKind('deposit_kind').notNull(), // official=cash, user=point
    entryAmount: numeric('entry_amount', { precision: 14, scale: 2 }).notNull(),
    serviceFeeRate: numeric('service_fee_rate', { precision: 5, scale: 4 })
      .notNull()
      .default('0.10'),
    distributionRule: jsonb('distribution_rule').notNull().default({}),
    noWinnerPolicy: text('no_winner_policy'), // Req 10.3
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    validDates: check('valid_dates', sql`${t.endDate} >= ${t.startDate}`),
    validCapacity: check(
      'valid_capacity',
      sql`${t.capacity} > 0 AND ${t.participantCount} >= 0 AND ${t.participantCount} <= ${t.capacity}`,
    ),
    validAmount: check('valid_amount', sql`${t.entryAmount} >= 0`),
    // Req 4.4: User_Challenge=point(+host), Official_Challenge=cash
    kindDepositConsistency: check(
      'kind_deposit_consistency',
      sql`
    (${t.kind} = 'official' AND ${t.depositKind} = 'cash')
    OR (${t.kind} = 'user' AND ${t.depositKind} = 'point' AND ${t.hostId} IS NOT NULL)`,
    ),
    openIdx: index('idx_challenges_open')
      .on(t.kind, t.status)
      .where(sql`${t.status} = 'recruiting'`),
  }),
);

// ---------------------------------------------------------------------------
// participations (Requirement 3, 5, 8) — design.md → "Data Models" /
// "participations"
//
// 참가 사실 + 생존 상태 + 예치금. (challenge, user) 쌍은 유일하며 중복 참가를
// 방지한다 (uq_participation, Req 3.3 / 5.4). 제약으로 정합성을 강제한다:
//   - deposit_non_negative: 예치금 음수 불가
//   - elim_date_consistency: survival_status='eliminated' 이면 eliminated_on 이
//     반드시 존재 (Req 8.1 일일 탈락 처리 시 탈락일 기록)
// `idx_part_challenge` 는 챌린지별 생존 상태 조회(리더보드/탈락 처리)를 가속한다.
// ---------------------------------------------------------------------------

export const participations = pgTable(
  'participations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`extensions.gen_random_uuid()`),
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    survivalStatus: survivalStatus('survival_status').notNull().default('alive'),
    depositKind: depositKind('deposit_kind').notNull(),
    depositAmount: numeric('deposit_amount', {
      precision: 14,
      scale: 2,
    }).notNull(),
    currentStreak: integer('current_streak').notNull().default(0),
    eliminatedOn: date('eliminated_on'),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Req 3.3 / 5.4: 동일 (challenge, user) 중복 참가 방지
    uqParticipation: unique('uq_participation').on(t.challengeId, t.userId),
    depositNonNegative: check(
      'deposit_non_negative',
      sql`${t.depositAmount} >= 0`,
    ),
    // Req 8.1: eliminated 이면 eliminated_on 필수
    elimDateConsistency: check(
      'elim_date_consistency',
      sql`
    (${t.survivalStatus} = 'eliminated' AND ${t.eliminatedOn} IS NOT NULL)
    OR (${t.survivalStatus} <> 'eliminated')`,
    ),
    partChallengeIdx: index('idx_part_challenge').on(
      t.challengeId,
      t.survivalStatus,
    ),
  }),
);

// ---------------------------------------------------------------------------
// daily_verifications (Requirement 6, 7) — design.md → "Data Models" /
// "daily_verifications"
//
// 참가자의 날짜별 인증 레코드. `uq_daily` UNIQUE(participation_id, verify_date)
// 로 날짜당 1건만 허용한다 (Req 7.4). 타이머 누적 초는 음수가 될 수 없으며
// (`accum_non_negative`, Req 6.3), `study_goal_met` 은 일일 요구시간 도달 시에만
// true 로 갱신된다 (Req 6.4). `idx_dv_date_state` 는 마감 경과 미인증자 조회(일일
// 탈락 처리)를 가속한다.
// ---------------------------------------------------------------------------

export const dailyVerifications = pgTable(
  'daily_verifications',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`extensions.gen_random_uuid()`),
    participationId: uuid('participation_id')
      .notNull()
      .references(() => participations.id, { onDelete: 'cascade' }),
    verifyDate: date('verify_date').notNull(),
    dailyGoal: text('daily_goal'), // Req 6.1
    accumulatedSeconds: integer('accumulated_seconds').notNull().default(0), // Req 6.3
    studyGoalMet: boolean('study_goal_met').notNull().default(false), // Req 6.4
    retrospective: text('retrospective'), // Req 7.1
    evidencePath: text('evidence_path'), // Storage 경로
    state: verificationState('state').notNull().default('pending'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Req 7.4: 날짜당 1건
    uqDaily: unique('uq_daily').on(t.participationId, t.verifyDate),
    accumNonNegative: check(
      'accum_non_negative',
      sql`${t.accumulatedSeconds} >= 0`,
    ),
    dateStateIdx: index('idx_dv_date_state').on(t.verifyDate, t.state),
  }),
);

// ---------------------------------------------------------------------------
// payment_transactions (Requirement 3.5, 9, 12.3) — design.md → "Data Models" /
// "payment_transactions"
//
// 현금 결제/환불 원장. `external_ref` UNIQUE 로 결제 webhook 멱등성을 보장한다
// (중복 webhook 무시, Req 3.5). `direction_check` 로 'charge'/'refund' 만 허용하고
// `amount_non_negative` 로 금액 음수를 방지한다. `point_discount` 는 포인트 할인
// 적용 금액을 기록한다 (Req 12.3).
// ---------------------------------------------------------------------------

export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`extensions.gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id),
    challengeId: uuid('challenge_id').references(() => challenges.id),
    participationId: uuid('participation_id').references(
      () => participations.id,
    ),
    direction: text('direction').notNull(), // 'charge' | 'refund'
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    pointDiscount: bigint('point_discount', { mode: 'number' })
      .notNull()
      .default(0), // Req 12.3
    status: paymentStatus('status').notNull().default('pending'),
    externalRef: text('external_ref').unique(), // 멱등성 (Req 3.5)
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    directionCheck: check(
      'direction_check',
      sql`${t.direction} IN ('charge', 'refund')`,
    ),
    amountNonNegative: check('amount_non_negative', sql`${t.amount} >= 0`),
  }),
);

// ---------------------------------------------------------------------------
// point_transactions (Requirement 11.5, 12.5, 14) — design.md → "Data Models" /
// "point_transactions"
//
// 포인트 원장(append-only). 모든 지갑 잔액 변화가 기록된다. `amount` 는 부호가
// 있으며(+적립 / −차감), `balance_after` 는 거래 직후 잔액이다.
// `balance_after_non_negative` CHECK 가 포인트 보존의 DB 레벨 최후 방어선이다
// (Req 14.2). `idx_pt_user` 는 사용자별 원장 이력 조회를 가속한다.
// ---------------------------------------------------------------------------

export const pointTransactions = pgTable(
  'point_transactions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`extensions.gen_random_uuid()`),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => pointWallets.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id),
    txnType: pointTxnType('txn_type').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(), // +적립 / -차감
    balanceAfter: bigint('balance_after', { mode: 'number' }).notNull(),
    reason: text('reason').notNull(), // Req 11.5 / 12.5
    refId: uuid('ref_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Req 14.2: 잔액 음수 불가 (포인트 보존 최후 방어선)
    balanceNonNegative: check(
      'balance_after_non_negative',
      sql`${t.balanceAfter} >= 0`,
    ),
    userIdx: index('idx_pt_user').on(t.userId, t.createdAt),
  }),
);

// ---------------------------------------------------------------------------
// reward_pools (Requirement 9, 10, 14) — design.md → "Data Models" /
// "reward_pools & settlements"
//
// 챌린지별 상금 풀. `challenge_id` UNIQUE 로 챌린지당 1개의 풀만 존재한다.
// `total_deposit` 은 Σ 모든 참가자 예치, `pool_amount` 는 Σ 탈락자 예치(재분배
// 대상), `service_fee` 는 산정된 서비스 수수료다. `pool_non_negative` CHECK 가
// 상금 풀 금액의 음수를 방지한다 (Req 14, 자원 보존 최후 방어선).
// ---------------------------------------------------------------------------

export const rewardPools = pgTable(
  'reward_pools',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`extensions.gen_random_uuid()`),
    challengeId: uuid('challenge_id')
      .notNull()
      .unique()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    depositKind: depositKind('deposit_kind').notNull(),
    totalDeposit: numeric('total_deposit', { precision: 14, scale: 2 })
      .notNull()
      .default('0'), // Σ 모든 예치
    poolAmount: numeric('pool_amount', { precision: 14, scale: 2 })
      .notNull()
      .default('0'), // Σ 탈락자 예치
    serviceFee: numeric('service_fee', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
  },
  (t) => ({
    poolNonNegative: check(
      'pool_non_negative',
      sql`${t.poolAmount} >= 0 AND ${t.totalDeposit} >= 0`,
    ),
  }),
);

// ---------------------------------------------------------------------------
// settlements (Requirement 9, 10, 14) — design.md → "Data Models" /
// "reward_pools & settlements"
//
// 종료 정산 시 완주자별 환불/보상 분배 기록. `refund_amount` 는 본인 예치금 환불,
// `reward_amount` 는 추가 보상이다. `settle_non_negative` CHECK 가 분배 금액의
// 음수를 방지한다 (Req 14).
// ---------------------------------------------------------------------------

export const settlements = pgTable(
  'settlements',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`extensions.gen_random_uuid()`),
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => challenges.id),
    participationId: uuid('participation_id')
      .notNull()
      .references(() => participations.id),
    refundAmount: numeric('refund_amount', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    rewardAmount: numeric('reward_amount', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    settledAt: timestamp('settled_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    settleNonNegative: check(
      'settle_non_negative',
      sql`${t.refundAmount} >= 0 AND ${t.rewardAmount} >= 0`,
    ),
  }),
);

// ---------------------------------------------------------------------------
// badges (Requirement 9.3, 10.4, 13.4) — design.md → "Data Models" /
// "badges / revival_tickets / surprise_missions / learning_reports"
//
// 사용자가 획득한 배지(완주 등). `uq_badge` UNIQUE(user_id, challenge_id,
// badge_type) 로 동일 배지 중복 지급을 방지한다(정산 시 onConflictDoNothing).
// ---------------------------------------------------------------------------

export const badges = pgTable(
  'badges',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`extensions.gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    challengeId: uuid('challenge_id').references(() => challenges.id),
    badgeType: text('badge_type').notNull(), // 'completion' 등
    awardedAt: timestamp('awarded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Req 9.3/10.4/13.4: 동일 (user, challenge, badge_type) 중복 지급 방지
    uqBadge: unique('uq_badge').on(t.userId, t.challengeId, t.badgeType),
  }),
);

// ---------------------------------------------------------------------------
// revival_tickets (Requirement 12.4) — design.md → "Data Models" /
// "badges / revival_tickets / surprise_missions / learning_reports"
//
// 부활권 구매/사용 기록. `point_cost` 는 부활권 포인트 비용이며
// `point_cost_non_negative` CHECK 로 음수를 방지한다. `used` 플래그로 사용 여부를
// 추적한다.
// ---------------------------------------------------------------------------

export const revivalTickets = pgTable(
  'revival_tickets',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`extensions.gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id),
    participationId: uuid('participation_id').references(
      () => participations.id,
    ),
    pointCost: bigint('point_cost', { mode: 'number' }).notNull(),
    used: boolean('used').notNull().default(false),
    purchasedAt: timestamp('purchased_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (t) => ({
    pointCostNonNegative: check(
      'point_cost_non_negative',
      sql`${t.pointCost} >= 0`,
    ),
  }),
);

// ---------------------------------------------------------------------------
// surprise_missions (Requirement 13.3) — design.md → "Data Models" /
// "badges / revival_tickets / surprise_missions / learning_reports"
//
// Operator 가 챌린지에 발행하는 돌발 미션. `active_from`/`active_until` 로
// 노출 기간을 관리한다.
// ---------------------------------------------------------------------------

export const surpriseMissions = pgTable('surprise_missions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`extensions.gen_random_uuid()`),
  challengeId: uuid('challenge_id')
    .notNull()
    .references(() => challenges.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  activeFrom: timestamp('active_from', { withTimezone: true })
    .notNull()
    .defaultNow(),
  activeUntil: timestamp('active_until', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => profiles.id),
});

// ---------------------------------------------------------------------------
// learning_reports (Requirement 9.3) — design.md → "Data Models" /
// "badges / revival_tickets / surprise_missions / learning_reports"
//
// 완주자에게 지급되는 학습 리포트(집계 데이터). `participation_id` UNIQUE 로
// 참가당 1건만 허용한다. `report_data` jsonb 에 집계 결과를 저장한다.
// ---------------------------------------------------------------------------

export const learningReports = pgTable('learning_reports', {
  id: uuid('id')
    .primaryKey()
    .default(sql`extensions.gen_random_uuid()`),
  participationId: uuid('participation_id')
    .notNull()
    .unique()
    .references(() => participations.id, { onDelete: 'cascade' }),
  reportData: jsonb('report_data').notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
