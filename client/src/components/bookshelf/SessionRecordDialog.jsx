import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getNextStartPage } from '@/lib/reading';

export function SessionRecordDialog({ book, open, onOpenChange, onSave }) {
  const endPageId = useId();
  const impressionId = useId();
  const overrideId = useId();
  const [draft, setDraft] = useState({ endPage: '', impression: '', startPageOverride: '' });
  const [errors, setErrors] = useState({});
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const defaultStartPage = getNextStartPage(book);
  const startPage = isOverrideOpen && draft.startPageOverride !== ''
    ? Number(draft.startPageOverride)
    : defaultStartPage;
  const endPage = Number(draft.endPage);
  const hasValidRange = Number.isInteger(startPage) && startPage >= 1
    && Number.isInteger(endPage) && endPage >= startPage;

  function resetDraft() {
    setDraft({ endPage: '', impression: '', startPageOverride: '' });
    setErrors({});
    setIsOverrideOpen(false);
    setSubmitError('');
    setIsSaving(false);
  }

  function handleOpenChange(nextOpen) {
    onOpenChange(nextOpen);
    if (!nextOpen) resetDraft();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};

    if (!Number.isInteger(endPage) || endPage < 1) {
      nextErrors.endPage = '1 이상의 끝난 페이지를 입력해 주세요.';
    } else if (!Number.isInteger(startPage) || startPage < 1) {
      nextErrors.startPageOverride = '1 이상의 시작 페이지를 입력해 주세요.';
    } else if (endPage < startPage) {
      nextErrors.endPage = `끝난 페이지는 ${startPage}쪽보다 앞설 수 없어요.`;
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    setSubmitError('');
    try {
      await onSave({
        endPage,
        startPageOverride: isOverrideOpen ? startPage : null,
        impression: draft.impression.trim(),
      });
      handleOpenChange(false);
    } catch (requestError) {
      setSubmitError(requestError.message);
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="record-dialog" showCloseButton={false}>
        <DialogHeader className="record-dialog__header">
          <p className="section-kicker">ADD A RECORD</p>
          <DialogTitle>오늘 읽은 자리를 남겨볼까요?</DialogTitle>
          <DialogDescription>{startPage}쪽부터 읽은 기록으로 남겨요.</DialogDescription>
        </DialogHeader>

        <form className="record-dialog__form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <Label htmlFor={endPageId}>오늘 끝낸 페이지</Label>
            <Input
              id={endPageId}
              name="endPage"
              type="number"
              min={startPage || 1}
              inputMode="numeric"
              value={draft.endPage}
              onChange={(event) => {
                setDraft((current) => ({ ...current, endPage: event.target.value }));
                if (errors.endPage) setErrors((current) => ({ ...current, endPage: undefined }));
              }}
              placeholder={`예: ${startPage + 15}`}
              autoFocus
              aria-invalid={Boolean(errors.endPage)}
            />
            {errors.endPage && <p className="field-error" role="alert">{errors.endPage}</p>}
          </div>

          <div className="record-range-preview" role="status" aria-live="polite">
            {hasValidRange
              ? `${startPage}–${endPage}쪽 · ${endPage - startPage + 1}쪽 읽음`
              : `${startPage}쪽부터 읽은 범위를 보여드릴게요.`}
          </div>

          <div className="field-group">
            <Label htmlFor={impressionId}>짧은 감상 <span>선택</span></Label>
            <textarea
              id={impressionId}
              name="impression"
              value={draft.impression}
              onChange={(event) => setDraft((current) => ({ ...current, impression: event.target.value }))}
              placeholder="한 줄이면 충분해요. 비워 두어도 괜찮아요."
              rows={4}
            />
          </div>

          {!isOverrideOpen ? (
            <Button className="record-dialog__override" type="button" variant="link" onClick={() => setIsOverrideOpen(true)}>
              시작 위치 직접 바꾸기
            </Button>
          ) : (
            <div className="field-group record-dialog__override-input">
              <Label htmlFor={overrideId}>시작 페이지</Label>
              <Input
                id={overrideId}
                name="startPageOverride"
                type="number"
                min="1"
                inputMode="numeric"
                value={draft.startPageOverride}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, startPageOverride: event.target.value }));
                  if (errors.startPageOverride) setErrors((current) => ({ ...current, startPageOverride: undefined }));
                }}
                placeholder={String(defaultStartPage)}
                aria-invalid={Boolean(errors.startPageOverride)}
              />
              {errors.startPageOverride && <p className="field-error" role="alert">{errors.startPageOverride}</p>}
            </div>
          )}
          {submitError && <p className="field-error" role="alert">{submitError}</p>}

          <div className="record-dialog__actions">
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => handleOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? '기록을 남기는 중이에요…' : '기록 페이지 추가'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
