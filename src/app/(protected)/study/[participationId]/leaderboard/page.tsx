import { requireSession } from '../../../../../web/auth/session';
import { getCoreAdapter } from '../../../../../web/adapters/core/registry';
import { ErrorState } from '../../../../../web/components/error-state';
import { Leaderboard } from '../../../../../web/components/server/leaderboard';
import { LeaderboardRealtime } from '../../../../../web/components/client/leaderboard-realtime';
export default async function LeaderboardPage({ params }: { params: Promise<{ participationId: string }> }) { const { participationId } = await params; const ctx = await requireSession(`/study/${participationId}/leaderboard`); const result = await getCoreAdapter().getLeaderboard(ctx, participationId); return <main>{result.ok ? <><Leaderboard board={result.value} /><LeaderboardRealtime challengeId={result.value.challengeId} /></> : <ErrorState message="순위를 불러오지 못했습니다." traceId={result.error.traceId} />}</main> }
