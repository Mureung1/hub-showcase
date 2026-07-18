'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '../../lib/supabase/browser';
import { realtimeDebounceMs, studyChannelName } from '../../realtime/channel';
export function LeaderboardRealtime({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const [connection,setConnection] = useState<'connected'|'reconnecting'|'offline'>('reconnecting');
  const [last,setLast] = useState<string | null>(null);
  useEffect(() => {
    let timeout: number | undefined;
    try {
      const client = getBrowserSupabaseClient();
      const channel = client.channel(studyChannelName(challengeId)).on('postgres_changes', { event: '*', schema: 'public', table: 'participations', filter: `challenge_id=eq.${challengeId}` }, () => {
        window.clearTimeout(timeout);
        timeout = window.setTimeout(() => { router.refresh(); setLast(new Date().toLocaleTimeString('ko-KR')); }, realtimeDebounceMs);
      }).subscribe((status: string) => setConnection(status === 'SUBSCRIBED' ? 'connected' : status === 'CLOSED' || status === 'CHANNEL_ERROR' ? 'offline' : 'reconnecting'));
      return () => { window.clearTimeout(timeout); void client.removeChannel(channel); };
    } catch { setConnection('offline'); return; }
  },[challengeId,router]);
  const refresh = () => { router.refresh(); setLast(new Date().toLocaleTimeString('ko-KR')); };
  return <div className="meta" role="status"><span className={`status ${connection === 'connected' ? '' : 'closed'}`}>{connection === 'connected' ? '실시간 연결됨' : connection === 'reconnecting' ? '재연결 중' : '오프라인'}</span><button className="button button-secondary" onClick={refresh}>순위 새로고침</button>{last && <span>마지막 갱신 {last}</span>}</div>;
}
