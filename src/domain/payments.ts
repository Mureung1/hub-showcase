/**
 * Payment / Official_Challenge join domain functions — design.md →
 * "Payment_Service" and "Challenge_Service" (`joinOfficialChallenge`).
 *
 * This module lives SEPARATELY from `challenges.ts` on purpose: it owns the
 * money-handling webhook contract for Official_Challenges, while `challenges.ts`
 * owns the point-based User_Challenge create/join path. Both share the point
 * ledger helpers from `points.ts`.
 *
 * Two entry points (Task 4.3):
 *   - {@link handlePaymentWebhook} — the Route Handler (web spec) entry. It
 *     verifies the provider signature FIRST (money gate), then on approval
 *     triggers the join transaction and on failure refuses to complete the
 *     participation (`PAYMENT_DECLINED`, Requirement 3.2).
 *   - {@link joinOfficialChallenge} — the atomic join transaction: lock the
 *     `challenges` row `FOR UPDATE`, check recruitment / duplicate, INSERT the
 *     `participations` row, record the `payment_transactions` charge, apply the
 *     point entry-discount, and fold the cash deposit into the reward pool.
 *
 * Conventions (mirroring `points.ts` / `challenges.ts`):
 *   - Inner functions THROW a {@link DomainErr} on a domain failure and return
 *     the raw success value; the transaction boundary rolls back on throw and
 *     the outer Route Handler converts it to a `Result<T>` (design.md → "오류
 *     전파 원칙").
 *   - The Drizzle handle is INJECTED (first argument) so the functions are
 *     testable against any client.
 *   - Every multi-write runs inside ONE `db.transaction(...)` (Requirement
 *     14.3). DB constraints backstop the app checks: `payment_transactions
 *     .external_ref` UNIQUE (webhook idempotency — Req 3.5 / Property 14),
 *     `uq_participation` (duplicate — Req 3.3), `valid_capacity` (cap — Req 3.4).
 *
 * SECURITY: the webhook is a money endpoint. Signature verification GATES the
 * join (an unverified event never creates a participation or a charge), and the
 * `external_ref` UNIQUE + in-transaction idempotency check prevent double-charge
 * / double-entry on webhook retries. The HMAC secret is sourced from the
 * `PAYMENT_WEBHOOK_SECRET` env var; when it is absent the webhook is rejected
 * (fail-closed) rather than silently trusted.
 *
 * Requirements traceability: 3.1, 3.2, 3.3, 3.4, 3.5, 12.3.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import {
  challenges,
  participations,
  paymentTransactions,
  rewardPools,
} from '../db/schema';
import type { Database } from '../db/index';
import { debitPoints } from './points';
import { DomainErr } from './errors';

/** A participation row's id. design.md → `ParticipationId`. */
export type ParticipationId = string;

/** Outcome the payment provider reports for a charge. */
export type PaymentWebhookStatus = 'approved' | 'failed';

/**
 * Normalized payment provider webhook event. The web spec's Route Handler maps
 * the raw provider payload onto this shape before calling
 * {@link handlePaymentWebhook}.
 *
 * `signature` is the provider's HMAC-SHA256 (hex) over the canonical payload of
 * the remaining fields (see {@link signPaymentWebhook}); it is what gates the
 * join. `externalRef` is the provider's unique reference for this charge and is
 * the idempotency key (persisted UNIQUE on `payment_transactions.external_ref`).
 */
export interface PaymentWebhookEvent {
  /** Provider's unique charge reference — idempotency key (Req 3.5). */
  externalRef: string;
  /** Charge outcome. `'approved'` completes the join; anything else declines. */
  status: PaymentWebhookStatus;
  /** The joining user's id (from the payment session metadata). */
  userId: string;
  /** The Official_Challenge being joined. */
  challengeId: string;
  /** Cash amount the provider actually charged, in currency units. */
  amount: number;
  /** Points applied as an entry discount at session creation (Req 12.3). */
  pointDiscount?: number;
  /** Provider HMAC-SHA256 (hex) over the canonical payload. */
  signature: string;
}

/** Optional settings for {@link joinOfficialChallenge}. */
export interface JoinOfficialOptions {
  /**
   * Cash amount the provider charged (currency units). When provided it is
   * cross-checked against the challenge's entry fee minus the point discount;
   * a mismatch is treated as a declined payment (tamper / misconfig guard).
   */
  chargedAmount?: number;
  /** Points applied as an entry discount (Req 12.3). Debited on join. */
  pointDiscount?: number;
}

/**
 * Raised when a webhook cannot be trusted: the signature does not verify, or
 * the signing secret is not configured. This is a security/protocol rejection
 * (map to HTTP 401/500 at the Route Handler), NOT a user-facing domain error,
 * so it is intentionally kept OUT of the closed {@link DomainErr} union.
 */
export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
    // Keep `instanceof` reliable across transpilation / subclassing.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Env var holding the shared HMAC secret used to verify payment webhooks. */
const WEBHOOK_SECRET_ENV = 'PAYMENT_WEBHOOK_SECRET';

/** Round a currency amount to 2 decimal places (avoids float drift). */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Deterministic canonical string signed by the provider. Field order and
 * formatting are fixed so both signer and verifier agree byte-for-byte. Every
 * value that matters for authorizing the join (who, which challenge, outcome,
 * amount, discount) is covered, so tampering with any of them breaks the HMAC.
 */
function canonicalWebhookPayload(
  event: Omit<PaymentWebhookEvent, 'signature'>,
): string {
  return [
    event.externalRef,
    event.userId,
    event.challengeId,
    event.status,
    round2(event.amount).toFixed(2),
    String(event.pointDiscount ?? 0),
  ].join('|');
}

/**
 * Compute the HMAC-SHA256 (hex) signature for a webhook payload. Exposed so the
 * web spec (and the payment session creation side) can produce/verify matching
 * signatures without duplicating the canonicalization rules.
 */
export function signPaymentWebhook(
  event: Omit<PaymentWebhookEvent, 'signature'>,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(canonicalWebhookPayload(event))
    .digest('hex');
}

/**
 * Constant-time comparison of two hex signatures. Returns false (rather than
 * throwing) on any malformed / length-mismatched input so a bad signature is
 * simply rejected.
 */
function safeEqualHex(expectedHex: string, providedHex: string): boolean {
  let expected: Buffer;
  let provided: Buffer;
  try {
    expected = Buffer.from(expectedHex, 'hex');
    provided = Buffer.from(providedHex, 'hex');
  } catch {
    return false;
  }
  // timingSafeEqual requires equal-length buffers.
  if (expected.length === 0 || expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

/**
 * Verify a webhook's signature against the configured secret. Fail-closed: if
 * the secret is not configured we reject rather than trust the event.
 *
 * @throws {WebhookVerificationError} if the secret is missing or the signature
 *   does not verify.
 */
function verifyWebhookSignature(event: PaymentWebhookEvent): void {
  const secret = process.env[WEBHOOK_SECRET_ENV];
  if (!secret) {
    throw new WebhookVerificationError(
      `Cannot verify payment webhook: "${WEBHOOK_SECRET_ENV}" is not configured.`,
    );
  }
  const expected = signPaymentWebhook(event, secret);
  if (!safeEqualHex(expected, event.signature ?? '')) {
    throw new WebhookVerificationError('Payment webhook signature is invalid.');
  }
}

/**
 * Register a user in an Official_Challenge after a cash payment was approved
 * (Requirement 3). Cash-based counterpart of `joinUserChallenge`.
 *
 * Everything runs inside ONE `db.transaction(...)`, so the point-discount
 * debit, the participation row, the payment charge record, the recruitment-count
 * bump, and the reward-pool update are all-or-nothing (Requirement 14.3). On any
 * failure the transaction rolls back and NOTHING is written.
 *
 * Idempotency (Req 3.5 / Property 14): the join is keyed on `paymentRef`
 * (`external_ref`). The `challenges` `FOR UPDATE` lock serializes concurrent
 * webhooks for the same challenge, so the in-transaction "already processed?"
 * check is race-free; the `external_ref` UNIQUE constraint is the last-line
 * backstop. A replayed webhook returns the existing participation id and writes
 * nothing new.
 *
 * Steps (design.md → "Challenge_Service" / Payment webhook):
 *   1. Require an authenticated user and a payment reference.
 *   2. Lock the `challenges` row `FOR UPDATE`; require an OPEN Official_Challenge.
 *   3. Idempotency: if a `payment_transactions` row with `paymentRef` exists,
 *      return its participation id (no-op).
 *   4. Reject a duplicate participation (Req 3.3) and a full roster (Req 3.4).
 *   5. Compute the cash deposit = entry fee − point discount; debit the discount
 *      points (Req 12.3) via {@link debitPoints} when > 0.
 *   6. INSERT the `participations` row (alive, cash deposit), record the
 *      `payment_transactions` charge (approved, `external_ref`, point discount),
 *      bump `participant_count`, and fold the cash deposit into the reward pool.
 *
 * @param db          injected Drizzle client (production `db`, or a test client)
 * @param userId      authenticated participant's user id
 * @param challengeId the Official_Challenge to join
 * @param paymentRef  provider charge reference (idempotency key → external_ref)
 * @param options     charged amount cross-check + point entry-discount
 * @returns the participation id (new, or the existing one on an idempotent replay)
 * @throws {DomainErr} `UNAUTHENTICATED` (no user id), `INVALID_CONFIG`
 *   (missing payment ref, challenge not found / not an Official_Challenge,
 *   discount exceeds entry fee), `CAPACITY_FULL` (recruitment closed or full —
 *   Req 3.4), `DUPLICATE_PARTICIPATION` (already joined — Req 3.3),
 *   `PAYMENT_DECLINED` (charged amount inconsistent with entry fee − discount),
 *   `INSUFFICIENT_POINTS` (discount exceeds the wallet balance — Req 12.2).
 */
export async function joinOfficialChallenge(
  db: Database,
  userId: string,
  challengeId: string,
  paymentRef: string,
  options: JoinOfficialOptions = {},
): Promise<ParticipationId> {
  // Req 1.5: an authenticated user is required (Route Handler verifies session).
  if (!userId) throw new DomainErr('UNAUTHENTICATED');
  // A cash join must be backed by a payment reference (the idempotency key).
  if (!paymentRef) {
    throw new DomainErr('INVALID_CONFIG', 'Missing payment reference');
  }

  const discount = options.pointDiscount ?? 0;
  if (!Number.isFinite(discount) || discount < 0 || !Number.isInteger(discount)) {
    throw new DomainErr('INVALID_CONFIG', 'pointDiscount must be a non-negative integer');
  }

  return db.transaction(async (tx) => {
    // Recruitment-count concurrency control + idempotency serialization: lock
    // the challenge row so all joins/webhooks for this challenge are serialized
    // (Property 12 / Property 14).
    const [ch] = await tx
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .for('update');

    if (!ch) {
      throw new DomainErr('INVALID_CONFIG', `Challenge not found: ${challengeId}`);
    }
    // This path is for cash-based Official_Challenges only; User_Challenges join
    // via joinUserChallenge (Task 4.2).
    if (ch.kind !== 'official') {
      throw new DomainErr('INVALID_CONFIG', 'Not an Official_Challenge');
    }

    // Req 3.5 / Property 14: idempotent webhook handling. If this payment
    // reference was already processed, return the existing participation and
    // write nothing new (no second charge, no second participation).
    const [existingPayment] = await tx
      .select({
        id: paymentTransactions.id,
        participationId: paymentTransactions.participationId,
      })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.externalRef, paymentRef));
    if (existingPayment) {
      if (existingPayment.participationId) return existingPayment.participationId;
      // A row with this ref exists but did not complete a join — treat the
      // payment as not usable to join (Req 3.2). external_ref UNIQUE prevents a
      // conflicting re-insert regardless.
      throw new DomainErr('PAYMENT_DECLINED');
    }

    // Req 3.4: recruitment must be open.
    if (ch.status !== 'recruiting') throw new DomainErr('CAPACITY_FULL');

    // Req 3.3: reject a duplicate join. Race-free under the challenge lock;
    // `uq_participation` UNIQUE is the last-line backstop.
    const [existingPart] = await tx
      .select({ id: participations.id })
      .from(participations)
      .where(
        and(
          eq(participations.challengeId, challengeId),
          eq(participations.userId, userId),
        ),
      );
    if (existingPart) throw new DomainErr('DUPLICATE_PARTICIPATION');

    // Req 3.4: roster must not be full. `valid_capacity` CHECK backstops.
    if (ch.participantCount >= ch.capacity) throw new DomainErr('CAPACITY_FULL');

    // Req 12.3: the point discount reduces the cash Entry_Fee 1:1. The cash
    // deposit is derived authoritatively from the challenge (never trusted from
    // the event), so a tampered amount cannot change what is at stake.
    const entryAmount = round2(Number(ch.entryAmount));
    const cashDeposit = round2(entryAmount - discount);
    if (cashDeposit < 0) {
      throw new DomainErr('INVALID_CONFIG', 'Point discount exceeds the entry fee');
    }
    // Cross-check the provider's charged amount against the expected cash. A
    // mismatch means the webhook does not correspond to a valid entry.
    if (
      options.chargedAmount !== undefined &&
      round2(options.chargedAmount) !== cashDeposit
    ) {
      throw new DomainErr('PAYMENT_DECLINED');
    }

    // Debit the discount points inside the same transaction (Req 12.3). A
    // shortfall throws INSUFFICIENT_POINTS → the whole join rolls back.
    if (discount > 0) {
      await debitPoints(
        tx,
        userId,
        discount,
        'entry_discount',
        'Official_Challenge 참가비 포인트 할인',
        challengeId,
      );
    }

    // Req 3.1: register the Participant as alive with the cash deposit.
    const cashDepositStr = cashDeposit.toFixed(2);
    const [part] = await tx
      .insert(participations)
      .values({
        challengeId,
        userId,
        survivalStatus: 'alive',
        depositKind: 'cash',
        depositAmount: cashDepositStr,
      })
      .returning({ id: participations.id });

    if (!part) {
      // Unreachable: a successful INSERT ... RETURNING always yields one row.
      throw new Error('joinOfficialChallenge: participation INSERT returned no row');
    }

    // Req 3.5: record the cash charge. `external_ref` UNIQUE makes a duplicate
    // webhook that slips past the check above fail here rather than double-charge.
    await tx.insert(paymentTransactions).values({
      userId,
      challengeId,
      participationId: part.id,
      direction: 'charge',
      amount: cashDepositStr,
      pointDiscount: discount,
      status: 'approved',
      externalRef: paymentRef,
    });

    // Bump the recruitment count (valid_capacity CHECK guarantees the cap).
    await tx
      .update(challenges)
      .set({ participantCount: sql`${challenges.participantCount} + 1` })
      .where(eq(challenges.id, challengeId));

    // Fold the cash deposit into the challenge's cash reward pool. The pool row
    // may not exist yet for an Official_Challenge, so upsert keeps it idempotent.
    await tx
      .insert(rewardPools)
      .values({
        challengeId,
        depositKind: 'cash',
        totalDeposit: cashDepositStr,
      })
      .onConflictDoUpdate({
        target: rewardPools.challengeId,
        set: {
          totalDeposit: sql`${rewardPools.totalDeposit} + ${cashDepositStr}`,
        },
      });

    return part.id;
  });
}

/**
 * Handle a payment provider webhook (Requirement 3). Route Handler (web spec)
 * entry point.
 *
 * Order of operations enforces the money gate:
 *   1. Verify the provider signature FIRST — an unverified event NEVER reaches
 *      the DB, so it can neither create a participation nor a charge (throws
 *      {@link WebhookVerificationError}).
 *   2. On `status === 'approved'`, trigger {@link joinOfficialChallenge} (which
 *      is itself idempotent on `external_ref`) and return the participation id.
 *   3. On any non-approved status, DO NOT complete the participation and throw
 *      `PAYMENT_DECLINED` (Req 3.2). This is a pure no-op on the DB, so repeated
 *      failed deliveries are inherently idempotent.
 *
 * @param db    injected Drizzle client (production `db`, or a test client)
 * @param event normalized provider webhook event (must carry a valid signature)
 * @returns the participation id (new, or existing on an idempotent replay)
 * @throws {WebhookVerificationError} if the signature is missing/invalid or the
 *   signing secret is not configured (fail-closed).
 * @throws {DomainErr} `PAYMENT_DECLINED` on a non-approved payment (Req 3.2), or
 *   any error propagated from {@link joinOfficialChallenge}.
 */
export async function handlePaymentWebhook(
  db: Database,
  event: PaymentWebhookEvent,
): Promise<ParticipationId> {
  // Money gate: reject anything we cannot cryptographically trust.
  verifyWebhookSignature(event);

  // Req 3.2: only an approved charge completes the join.
  if (event.status !== 'approved') {
    throw new DomainErr('PAYMENT_DECLINED');
  }

  return joinOfficialChallenge(db, event.userId, event.challengeId, event.externalRef, {
    chargedAmount: event.amount,
    pointDiscount: event.pointDiscount,
  });
}
