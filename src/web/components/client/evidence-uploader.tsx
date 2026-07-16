'use client';
import { useActionState, useEffect, useState } from 'react';
import { createEvidenceUploadAction } from '../../actions/study-actions';
import { initialActionState } from '../../errors/action-state';
import { getBrowserSupabaseClient } from '../../lib/supabase/browser';
export function EvidenceUploader({ participationId, date, onPath }: { participationId: string; date: string; onPath?: (path: string) => void }) {
  const [file,setFile] = useState<File | null>(null);
  const [uploadStatus,setUploadStatus] = useState('');
  const [state,action,pending] = useActionState(createEvidenceUploadAction, initialActionState);
  const path = state.data?.evidencePath;
  const token = state.data?.token;
  useEffect(() => {
    if (!file || typeof path !== 'string' || typeof token !== 'string') return;
    let cancelled = false;
    setUploadStatus('파일 업로드 중…');
    getBrowserSupabaseClient().storage.from('evidence').uploadToSignedUrl(path, token, file, { contentType: file.type }).then(({ error }: { error: unknown }) => {
      if (cancelled) return;
      if (error) setUploadStatus('업로드에 실패했습니다. 다시 시도해 주세요.');
      else { setUploadStatus('업로드를 완료했습니다.'); onPath?.(path); }
    });
    return () => { cancelled = true; };
  }, [file,onPath,path,token]);
  return <form action={action}><input type="hidden" name="participationId" value={participationId} /><input type="hidden" name="date" value={date} /><input type="hidden" name="type" value={file?.type ?? ''} /><input type="hidden" name="size" value={file?.size ?? 0} /><label className="field">학습 증빙 파일<input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label><button className="button button-secondary" disabled={!file || pending}>{pending ? '준비 중…' : '안전하게 업로드'}</button>{state.message && state.status === 'error' && <p role="alert" className="error-text">{state.message}</p>}{uploadStatus && <p role="status">{uploadStatus}</p>}</form>;
}
