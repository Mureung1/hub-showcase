'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '../../lib/supabase/browser';
import { realtimeDebounceMs, studyChannelName } from '../../realtime/channel';
export function MissionRealtime({ challengeId }: { challengeId: string }) { const router = useRouter(); const [status,setStatus] = useState('미션 연결 중'); useEffect(() => { let timer: number | undefined; try { const client = getBrowserSupabaseClient(); const channel = client.channel(`${studyChannelName(challengeId)}:missions`).on('postgres_changes',{ event:'*', schema:'public', table:'surprise_missions', filter:`challenge_id=eq.${challengeId}`},() => { window.clearTimeout(timer); timer = window.setTimeout(() => router.refresh(),realtimeDebounceMs); }).subscribe((value: string) => setStatus(value === 'SUBSCRIBED' ? '미션 실시간 연결됨' : '미션 재연결 중')); return () => { window.clearTimeout(timer); void client.removeChannel(channel); }; } catch { setStatus('미션 수동 갱신 가능'); return; } },[challengeId,router]); return <span role="status" className="muted">{status}</span>; }
