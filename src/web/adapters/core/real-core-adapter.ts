import type { CoreAdapter } from './core-adapter';
import { adapterError, type AdapterResult } from './types';
import { isDomainErr } from '../../../domain/errors';
import type { CreateUserChallengeInput } from '../../dto/challenge';

async function runCore<T>(operation: () => Promise<T>): Promise<AdapterResult<T>> {
  try { return { ok: true, value: await operation() }; }
  catch (error) {
    if (isDomainErr(error)) return { ok: false, error: { source: 'core', code: error.code, traceId: crypto.randomUUID(), retryable: false } };
    return adapterError('UNKNOWN', true);
  }
}

/** Real mappings are enabled only where the current core exposes enough data to satisfy the Web DTO without guessing. */
export class RealCoreAdapter implements CoreAdapter {
  async getFeaturedOfficialChallenge() { return adapterError('NOT_IMPLEMENTED'); }
  async listPublicUserChallenges() { return adapterError('NOT_IMPLEMENTED'); }
  async getUserChallengeDetail() { return adapterError('NOT_IMPLEMENTED'); }
  async createUserChallenge(ctx: Parameters<CoreAdapter['createUserChallenge']>[0], input: CreateUserChallengeInput) {
    return runCore(async () => {
      const [{ db }, { createUserChallenge }] = await Promise.all([import('../../../db/index'), import('../../../domain/challenges')]);
      const challengeId = await createUserChallenge(db, ctx.sessionUserId, { title: input.title, description: input.description, startDate: input.startsOn, endDate: input.endsOn, dailyStudyMinutes: input.dailyMinutes, verificationDeadlineTime: input.verificationDeadline, timezone: 'Asia/Seoul', capacity: input.capacity, entryPoints: input.entryPoints, visibility: input.visibility });
      return { challengeId };
    });
  }
  async joinUserChallenge(ctx: Parameters<CoreAdapter['joinUserChallenge']>[0], input: Parameters<CoreAdapter['joinUserChallenge']>[1]) {
    return runCore(async () => {
      const [{ db }, challenges, points] = await Promise.all([import('../../../db/index'), import('../../../domain/challenges'), import('../../../domain/points')]);
      const participationId = await challenges.joinUserChallenge(db, ctx.sessionUserId, input.challengeId);
      const balanceAfter = await points.getWalletBalance(db, ctx.sessionUserId);
      return { participationId, balanceAfter };
    });
  }
  async getOfficialCheckoutQuote() { return adapterError('NOT_IMPLEMENTED'); }
  async getOfficialPaymentReturnStatus() { return adapterError('NOT_IMPLEMENTED'); }
  async handlePaymentEvent() { return adapterError('NOT_IMPLEMENTED'); }
  async getStudyWorkspace() { return adapterError('NOT_IMPLEMENTED'); }
  async authorizeEvidenceUpload() { return adapterError('NOT_IMPLEMENTED'); }
  async submitDailyGoal() { return adapterError('NOT_IMPLEMENTED'); }
  async recordTimerSession() { return adapterError('NOT_IMPLEMENTED'); }
  async submitVerification() { return adapterError('NOT_IMPLEMENTED'); }
  async getProgress() { return adapterError('NOT_IMPLEMENTED'); }
  async getLeaderboard() { return adapterError('NOT_IMPLEMENTED'); }
  async getWallet(ctx: Parameters<CoreAdapter['getWallet']>[0]) {
    return runCore(async () => { const [{ db }, { getWalletBalance }] = await Promise.all([import('../../../db/index'), import('../../../domain/points')]); return { balance: await getWalletBalance(db, ctx.sessionUserId), updatedAt: ctx.now.toISOString() }; });
  }
  async getLedger(ctx: Parameters<CoreAdapter['getLedger']>[0], _cursor?: string) {
    return runCore(async () => { const [{ db }, { getTransactionHistory }] = await Promise.all([import('../../../db/index'), import('../../../domain/points')]); const rows = await getTransactionHistory(db, ctx.sessionUserId); return { items: rows.map((row) => ({ id: row.id, amount: Math.abs(row.amount), direction: row.amount >= 0 ? 'credit' as const : 'debit' as const, reason: row.reason, occurredAt: row.createdAt.toISOString() })), nextCursor: null }; });
  }
  async getProfile() { return adapterError('NOT_IMPLEMENTED'); }
  async getLearningReport() { return adapterError('NOT_IMPLEMENTED'); }
  async getActiveMission() { return adapterError('NOT_IMPLEMENTED'); }
  async processDailyEliminations(input: Parameters<CoreAdapter['processDailyEliminations']>[0]) {
    return runCore(async () => { const [{ db }, { processDailyEliminations }] = await Promise.all([import('../../../db/index'), import('../../../domain/eliminations')]); const result = await processDailyEliminations(db, new Date(input.runAt)); return { processed: result.eliminated }; });
  }
  async listSettlementCandidates() { return adapterError('NOT_IMPLEMENTED'); }
  async settleChallenge(input: Parameters<CoreAdapter['settleChallenge']>[0]) {
    return runCore(async () => { const [{ db }, { settleChallenge }] = await Promise.all([import('../../../db/index'), import('../../../domain/settlement')]); const result = await settleChallenge(db, input.challengeId); return { challengeId: result.challengeId, participantCount: result.finisherCount + result.eliminatedCount, settledAt: new Date().toISOString() }; });
  }
}
