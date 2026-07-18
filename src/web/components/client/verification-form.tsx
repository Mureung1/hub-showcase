'use client';
import { useActionState, useState } from 'react';
import { submitVerificationAction } from '../../actions/study-actions';
import { initialActionState } from '../../errors/action-state';
import { EvidenceUploader } from './evidence-uploader';
export function VerificationForm({ participationId, date }: { participationId: string; date: string }) { const [path,setPath] = useState(''); const [state,action,pending] = useActionState(submitVerificationAction, initialActionState); return <div><EvidenceUploader participationId={participationId} date={date} onPath={setPath} /><form action={action}><input type="hidden" name="participationId" value={participationId} /><input type="hidden" name="date" value={date} /><input type="hidden" name="evidencePath" value={path} /><label className="field">오늘의 회고<textarea name="retrospective" rows={5} minLength={10} required placeholder="무엇을 배웠고 내일은 무엇을 바꿀까요?" /></label><button className="button button-primary" disabled={!path || pending}>{pending ? '인증 중…' : '오늘 생존 인증하기'}</button>{state.message && <p role="status">{state.message}</p>}</form></div> }
