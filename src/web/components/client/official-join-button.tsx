'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { joinOfficialChallengeAction } from '../../actions/challenge-actions';
import { initialActionState } from '../../errors/action-state';

export function OfficialJoinButton({
  challengeId,
  entryPoints,
}: {
  challengeId: string;
  entryPoints: number;
}) {
  const [state, action, pending] = useActionState(
    joinOfficialChallengeAction,
    initialActionState,
  );
  const participationId = state.data?.participationId;

  return (
    <form action={action}>
      <input type="hidden" name="challengeId" value={challengeId} />
      <button className="button button-primary" disabled={pending}>
        {pending
          ? '포인트 차감 중…'
          : `${entryPoints.toLocaleString('ko-KR')}P로 참가하기`}
      </button>
      {state.message && (
        <p
          role="status"
          className={state.status === 'error' ? 'error-text' : ''}
        >
          {state.message}
        </p>
      )}
      {typeof participationId === 'string' && (
        <Link
          className="button button-secondary"
          href={`/study/${participationId}`}
        >
          학습 시작하기
        </Link>
      )}
    </form>
  );
}
