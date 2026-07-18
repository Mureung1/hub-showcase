import type { CoreAdapter } from './core-adapter';
import { adapterError, adapterOk } from './types';
import { featuredOfficial, malformedOfficialCandidateCount, officialFixtures, userChallenges, type OfficialFixtureScenario } from './fixtures/challenges';
const today = '2026-07-16';
const progress = { date: today, goal: '핵심 개념 한 장 정리', confirmedSeconds: 1260, requiredSeconds: 1800, verification: 'pending' as const };
export class MockAdapter implements CoreAdapter {
  constructor(private readonly officialScenario: OfficialFixtureScenario = (process.env.MOCK_OFFICIAL_SCENARIO as OfficialFixtureScenario | undefined) ?? 'recruiting') {}
  async getFeaturedOfficialChallenge() { if (this.officialScenario === 'none') return adapterOk(null); if (this.officialScenario === 'malformed') { void malformedOfficialCandidateCount; return adapterError('CONFIGURATION_ERROR'); } return adapterOk(officialFixtures[this.officialScenario] ?? featuredOfficial); }
  async listPublicUserChallenges(input: Parameters<CoreAdapter['listPublicUserChallenges']>[0]) { const q = input.query?.trim().toLocaleLowerCase(); return adapterOk({ items: userChallenges.filter((item) => (!q || `${item.title} ${item.summary}`.toLocaleLowerCase().includes(q)) && (!input.status || input.status === 'all' || item.status === input.status)), nextCursor: null }); }
  async getUserChallengeDetail(id: string) { const item = userChallenges.find((value) => value.challengeId === id); return item ? adapterOk(item) : adapterError('VALIDATION_ERROR'); }
  createUserChallenge(_ctx: Parameters<CoreAdapter['createUserChallenge']>[0], _input: Parameters<CoreAdapter['createUserChallenge']>[1]): ReturnType<CoreAdapter['createUserChallenge']> { return Promise.resolve(adapterOk({ challengeId: 'new-user-challenge' })); }
  async joinUserChallenge(_ctx: Parameters<CoreAdapter['joinUserChallenge']>[0], input: Parameters<CoreAdapter['joinUserChallenge']>[1]) { return adapterOk({ participationId: `participation-${input.challengeId}`, balanceAfter: 750 }); }
  async getOfficialCheckoutQuote(_ctx: Parameters<CoreAdapter['getOfficialCheckoutQuote']>[0], input: Parameters<CoreAdapter['getOfficialCheckoutQuote']>[1]) { return adapterOk({ challengeId: featuredOfficial.challengeId, externalReference: crypto.randomUUID(), status: 'recruiting' as const, amountMinor: Math.max(0, featuredOfficial.price.amountMinor - input.pointDiscount), currency: 'KRW', pointDiscount: input.pointDiscount }); }
  async getOfficialPaymentReturnStatus() { return adapterOk({ status: 'processing' as const, challengeId: featuredOfficial.challengeId, message: '결제 결과를 안전하게 확인하고 있습니다.' }); }
  async handlePaymentEvent() { return adapterOk({ duplicate: false, participationId: 'official-participation' }); }
  async getStudyWorkspace(_ctx: Parameters<CoreAdapter['getStudyWorkspace']>[0], participationId: string) { return adapterOk({ participationId, challengeId: featuredOfficial.challengeId, challengeTitle: featuredOfficial.title, localDate: today, survivalStatus: 'alive' as const, deadlineAt: '2026-07-16T14:59:59.000Z', progress }); }
  async authorizeEvidenceUpload(ctx: Parameters<CoreAdapter['authorizeEvidenceUpload']>[0], input: Parameters<CoreAdapter['authorizeEvidenceUpload']>[1]) { return adapterOk({ userId: ctx.sessionUserId, challengeId: '10000000-0000-4000-8000-000000000001', date: input.date }); }
  async submitDailyGoal(_ctx: Parameters<CoreAdapter['submitDailyGoal']>[0], input: Parameters<CoreAdapter['submitDailyGoal']>[1]) { return adapterOk({ ...progress, date: input.date, goal: input.goal }); }
  async recordTimerSession(_ctx: Parameters<CoreAdapter['recordTimerSession']>[0], input: Parameters<CoreAdapter['recordTimerSession']>[1]) { return adapterOk({ ...progress, date: input.date, confirmedSeconds: progress.confirmedSeconds + input.elapsedSeconds }); }
  async submitVerification() { return adapterOk({ status: 'complete' as const, completedAt: new Date().toISOString() }); }
  async getProgress() { return adapterOk({ completedDays: 12, totalDays: 30, streak: 7, survivalStatus: 'alive' as const }); }
  async getLeaderboard() { return adapterOk({ challengeId: featuredOfficial.challengeId, aliveCount: 23, entries: [{ rank: 1, displayName: '루틴메이커', streak: 12, status: 'alive' as const, isViewer: false }, { rank: 7, displayName: '나', streak: 7, status: 'alive' as const, isViewer: true }] }); }
  getWallet(_ctx: Parameters<CoreAdapter['getWallet']>[0]): ReturnType<CoreAdapter['getWallet']> { return Promise.resolve(adapterOk({ balance: 1250, updatedAt: new Date().toISOString() })); }
  getLedger(_ctx: Parameters<CoreAdapter['getLedger']>[0], _cursor?: string): ReturnType<CoreAdapter['getLedger']> { return Promise.resolve(adapterOk({ items: [{ id: 'ledger-1', amount: 500, direction: 'credit' as const, reason: '가입 보너스', occurredAt: '2026-07-01T00:00:00.000Z' }, { id: 'ledger-2', amount: 300, direction: 'debit' as const, reason: '새벽 독서 참가', occurredAt: '2026-07-12T02:00:00.000Z' }], nextCursor: null })); }
  async getProfile() { return adapterOk({ displayName: '집중하는 학습자', joinedAt: '2026-06-01', badges: [{ id: 'badge-1', name: '7일 연속 생존', challengeTitle: featuredOfficial.title, awardedAt: '2026-07-14T00:00:00.000Z' }] }); }
  async getLearningReport() { return adapterOk({ challengeTitle: featuredOfficial.title, summary: '꾸준한 저녁 학습 루틴을 만들었습니다.', totalMinutes: 930, completedDays: 28, longestStreak: 14 }); }
  async getActiveMission() { return adapterOk({ id: 'mission-1', title: '보너스 집중 10분', description: '오늘 확정 학습 시간을 10분 더 채워 보세요.', endsAt: '2026-07-16T14:59:59.000Z' }); }
  processDailyEliminations(_input: Parameters<CoreAdapter['processDailyEliminations']>[0]): ReturnType<CoreAdapter['processDailyEliminations']> { return Promise.resolve(adapterOk({ processed: 0 })); }
  async listSettlementCandidates() { return adapterOk([] as readonly string[]); }
  async settleChallenge(input: Parameters<CoreAdapter['settleChallenge']>[0]) { return adapterOk({ challengeId: input.challengeId, participantCount: 0, settledAt: new Date().toISOString() }); }
}
