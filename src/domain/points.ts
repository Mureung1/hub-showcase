/**
 * Point system domain functions — design.md → "Point system" and
 * "서버 트랜잭션 도메인 함수" / "포인트 차감/적립".
 *
 * The point wallet is the core of resource-conservation integrity
 * (Requirement 14). Every balance change is performed by ONE of the two write
 * functions below, and each one does two things ATOMICALLY inside the caller's
 * transaction:
 *
 *   1. `UPDATE point_wallets.balance` (row locked `FOR UPDATE`), and
 *   2. `INSERT` an append-only `point_transactions` ledger row (signed amount +
 *      `balance_after`).
 *
 * Both `debitPoints` and `creditPoints` take an INJECTED transaction handle
 * (`tx: DbTx`) rather than opening their own transaction. This lets higher-
 * level domain functions (join / verify / settle — Tasks 4, 6, 9) compose a
 * point movement inside their OWN `db.transaction(...)` so the whole operation
 * is all-or-nothing (design.md: "다른 트랜잭션(정산·인증)에 참여할 때는 해당 tx
 * 핸들을 주입받아 동일 트랜잭션에서 실행"). If the surrounding transaction throws
 * anywhere, the wallet UPDATE and ledger INSERT roll back together
 * (Requirement 14.3).
 *
 * Defence in depth: the application-level checks here (non-positive amount,
 * insufficient balance) are backstopped by DB constraints `wallet_non_negative`
 * and `balance_after_non_negative` (Requirement 14.2) — if a caller ever bypass
 * the checks, the DB still refuses to let a balance go negative.
 *
 * Reads (`getWalletBalance`, `getTransactionHistory`) accept a {@link DbExecutor}
 * (the top-level `db` or a `tx`) so they can run standalone or inside a
 * transaction; they never mutate state.
 *
 * Requirements traceability: 5.1, 11.1, 11.2, 11.3, 11.5, 12.1, 12.2, 12.5,
 * 14.2, 14.3.
 */

import { eq, desc } from 'drizzle-orm';
import { pointWallets, pointTransactions } from '../db/schema';
import type { DbTx, DbExecutor } from '../db/index';
import { DomainErr } from './errors';

/**
 * Reason category for a point movement — the `point_txn_type` enum. Derived
 * from the schema so it stays in sync with the ENUM definition. Maps to
 * `point_transactions.txn_type`.
 */
export type PointReason = (typeof pointTransactions.$inferInsert)['txnType'];

/** A point wallet balance, in whole point units. */
export type Balance = number;

/** A row of the append-only point ledger. */
export type PointTransaction = typeof pointTransactions.$inferSelect;

/**
 * Apply a signed balance delta to a user's wallet and record the ledger row,
 * atomically, inside the caller's transaction.
 *
 * Steps (design.md sequence): lock the wallet row `FOR UPDATE` → compute the
 * new balance → reject if it would go negative → `UPDATE` the wallet → `INSERT`
 * the signed ledger row with `balance_after`.
 *
 * @param signedAmount negative for a debit, positive for a credit.
 */
async function applyBalanceDelta(
  tx: DbTx,
  userId: string,
  signedAmount: number,
  txnType: PointReason,
  reason: string,
  ref: string | undefined,
): Promise<Balance> {
  // Concurrency control: lock the wallet row so concurrent debits/credits for
  // the same user are serialized (design.md: "지갑 행 잠금").
  const [wallet] = await tx
    .select()
    .from(pointWallets)
    .where(eq(pointWallets.userId, userId))
    .for('update');

  // Every user is provisioned a wallet by the `handle_new_user` trigger, so a
  // missing wallet means an unknown / invalid user id.
  if (!wallet) throw new DomainErr('UNAUTHENTICATED');

  const newBalance = wallet.balance + signedAmount;
  // Insufficient balance on a debit → throw so the surrounding transaction
  // rolls back (Req 5.2 / 12.2). Backstopped by `wallet_non_negative` /
  // `balance_after_non_negative` CHECKs (Req 14.2).
  if (newBalance < 0) throw new DomainErr('INSUFFICIENT_POINTS');

  await tx
    .update(pointWallets)
    .set({ balance: newBalance, updatedAt: new Date() })
    .where(eq(pointWallets.id, wallet.id));

  // Append-only ledger row (Req 11.5 / 12.5). `amount` is signed
  // (+credit / -debit); `balance_after` snapshots the post-move balance.
  await tx.insert(pointTransactions).values({
    walletId: wallet.id,
    userId,
    txnType,
    amount: signedAmount,
    balanceAfter: newBalance,
    reason,
    refId: ref ?? null,
  });

  return newBalance;
}

/**
 * Deduct `amount` points from a user's wallet (challenge join, entry discount,
 * revival ticket, ...). Rejects non-positive amounts and insufficient balance.
 *
 * Requirement 12: 잔액 이상이면 차감, 미만이면 `INSUFFICIENT_POINTS` → 롤백.
 *
 * @param tx      surrounding transaction handle (injected for atomic composition)
 * @param amount  positive whole number of points to debit
 * @param txnType `point_txn_type` category recorded on the ledger row
 * @param reason  human-readable reason recorded on the ledger row (Req 12.5)
 * @param ref     optional related entity id (e.g. challenge id)
 * @returns the new balance after the debit
 * @throws {DomainErr} `INVALID_CONFIG` if amount <= 0,
 *   `UNAUTHENTICATED` if the wallet is missing,
 *   `INSUFFICIENT_POINTS` if the balance would go negative.
 */
export async function debitPoints(
  tx: DbTx,
  userId: string,
  amount: number,
  txnType: PointReason,
  reason: string,
  ref?: string,
): Promise<Balance> {
  if (amount <= 0) throw new DomainErr('INVALID_CONFIG');
  return applyBalanceDelta(tx, userId, -amount, txnType, reason, ref);
}

/**
 * Credit `amount` points to a user's wallet (challenge completion, streak
 * bonus, retrospective bonus, invite bonus, reward distribution, ...). Rejects
 * non-positive amounts.
 *
 * Requirement 11: 적립 사유·금액을 포함한 원장 기록 (Req 11.5).
 *
 * @param tx      surrounding transaction handle (injected for atomic composition)
 * @param amount  positive whole number of points to credit
 * @param txnType `point_txn_type` category recorded on the ledger row
 * @param reason  human-readable reason recorded on the ledger row (Req 11.5)
 * @param ref     optional related entity id (e.g. challenge id)
 * @returns the new balance after the credit
 * @throws {DomainErr} `INVALID_CONFIG` if amount <= 0,
 *   `UNAUTHENTICATED` if the wallet is missing.
 */
export async function creditPoints(
  tx: DbTx,
  userId: string,
  amount: number,
  txnType: PointReason,
  reason: string,
  ref?: string,
): Promise<Balance> {
  if (amount <= 0) throw new DomainErr('INVALID_CONFIG');
  return applyBalanceDelta(tx, userId, amount, txnType, reason, ref);
}

/**
 * Read a user's current wallet balance (read-only). design.md → `PointSystem`.
 *
 * @param executor top-level `db` or a transaction handle
 * @throws {DomainErr} `UNAUTHENTICATED` if the user has no wallet.
 */
export async function getWalletBalance(
  executor: DbExecutor,
  userId: string,
): Promise<Balance> {
  const [wallet] = await executor
    .select({ balance: pointWallets.balance })
    .from(pointWallets)
    .where(eq(pointWallets.userId, userId));

  if (!wallet) throw new DomainErr('UNAUTHENTICATED');
  return wallet.balance;
}

/**
 * Read a user's point ledger, most recent first (read-only). design.md →
 * `PointSystem`. Ordered by `created_at` desc, tie-broken by `id` desc for a
 * stable order when multiple rows share a timestamp.
 *
 * @param executor top-level `db` or a transaction handle
 */
export async function getTransactionHistory(
  executor: DbExecutor,
  userId: string,
): Promise<PointTransaction[]> {
  return executor
    .select()
    .from(pointTransactions)
    .where(eq(pointTransactions.userId, userId))
    .orderBy(desc(pointTransactions.createdAt), desc(pointTransactions.id));
}
