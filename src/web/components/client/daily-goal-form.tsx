'use client';
import { useActionState } from 'react';
import { submitDailyGoalAction } from '../../actions/study-actions';
import { initialActionState } from '../../errors/action-state';
export function DailyGoalForm({ participationId, date, defaultGoal }: { participationId: string; date: string; defaultGoal: string | null }) { const [state, action, pending] = useActionState(submitDailyGoalAction, initialActionState); return <form action={action}><input type="hidden" name="participationId" value={participationId} /><input type="hidden" name="date" value={date} /><label className="field">오늘의 한 가지 목표<textarea name="goal" rows={3} maxLength={300} required defaultValue={defaultGoal ?? ''} /></label><button className="button button-primary" disabled={pending}>{pending ? '저장 중…' : '목표 저장'}</button>{state.message && <p role="status">{state.message}</p>}</form> }
