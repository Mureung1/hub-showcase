'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { joinUserChallengeAction } from '../../actions/challenge-actions';
import { initialActionState } from '../../errors/action-state';
export function JoinUserChallengeButton({ challengeId, entryPoints, disabled }: { challengeId: string; entryPoints: number; disabled: boolean }) { const [state, action, pending] = useActionState(joinUserChallengeAction, initialActionState); const participationId = state.data?.participationId; return <form action={action}><input type="hidden" name="challengeId" value={challengeId} /><button className="button button-primary" disabled={disabled || pending}>{pending ? '참가 처리 중…' : disabled ? '모집이 마감되었습니다' : `${entryPoints}P로 참가하기`}</button>{state.message && <p role="status" className={state.status === 'error' ? 'error-text' : ''}>{state.message}</p>}{typeof participationId === 'string' && <Link className="button button-secondary" href={`/study/${participationId}`}>학습 시작하기</Link>}</form> }
