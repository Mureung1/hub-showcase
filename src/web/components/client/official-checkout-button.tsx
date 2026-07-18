'use client';
import { useActionState } from 'react';
import { startOfficialCheckoutAction } from '../../actions/challenge-actions';
import { initialActionState } from '../../errors/action-state';
export function OfficialCheckoutButton({ maxPointDiscount }: { maxPointDiscount: number }) { const [state, action, pending] = useActionState(startOfficialCheckoutAction, initialActionState); return <form action={action}><label className="field">사용할 Point<input name="pointDiscount" type="number" min="0" max={maxPointDiscount} step="1" defaultValue="0" /></label><button className="button button-primary" disabled={pending}>{pending ? '결제 준비 중…' : '참가 신청하기'}</button>{state.message && <p role="status" className={state.status === 'error' ? 'error-text' : ''}>{state.message}</p>}</form> }
