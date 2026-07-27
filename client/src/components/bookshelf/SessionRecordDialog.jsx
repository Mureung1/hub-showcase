import { useEffect, useId, useRef, useState } from 'react';

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

export function SessionRecordDialog({ book, record = null, canEditPage = true, open, onOpenChange, onSave }) {
  const endPageId = useId();
  const impressionId = useId();
  const quoteId = useId();
  const overrideId = useId();
  const finalFocusRef = useRef(null);
  const wasOpenRef = useRef(open);
  if (open && !wasOpenRef.current && typeof document !== 'undefined') {
    finalFocusRef.current = document.activeElement;
  }
  wasOpenRef.current = open;
  const [draft, setDraft] = useState({
    endPage: '',
    impression: '',
    quoteText: '',
    startPageOverride: '',
  });
  const [errors, setErrors] = useState({});
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(record);
  const defaultStartPage = record?.startPage ?? getNextStartPage(book);
  const isPageEditable = !isEditing || canEditPage;
  const startPage = isOverrideOpen && draft.startPageOverride !== ''
    ? Number(draft.startPageOverride)
    : defaultStartPage;
  const endPage = Number(draft.endPage);
  const hasValidRange = Number.isInteger(startPage) && startPage >= 1
    && Number.isInteger(endPage) && endPage >= startPage;

  function resetDraft() {
    setDraft({ endPage: '', impression: '', quoteText: '', startPageOverride: '' });
    setErrors({});
    setIsOverrideOpen(false);
    setSubmitError('');
    setIsSaving(false);
  }

  function handleOpenChange(nextOpen) {
    if (!nextOpen && isSaving) return;
    onOpenChange(nextOpen);
    if (!nextOpen) resetDraft();
  }

  useEffect(() => {
    if (!open) return;

    if (record) {
      setDraft({
        endPage: String(record.endPage),
        impression: record.impression ?? '',
        quoteText: '',
        startPageOverride: '',
      });
      setErrors({});
      setIsOverrideOpen(false);
      setSubmitError('');
      setIsSaving(false);
      return;
    }

    resetDraft();
  }, [open, record]);

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};

    if (!Number.isInteger(endPage) || endPage < 1) {
      nextErrors.endPage = '1 이상의 끝난 페이지를 입력해 주세요.';
    } else if (!Number.isInteger(startPage) || startPage < 1) {
      nextErrors.startPageOverride = '1 이상의 시작 페이지를 입력해 주세요.';
    } else if (endPage < startPage) {
      nextErrors.endPage = `끝난 페이지는 ${startPage}쪽보다 앞설 수 없어요.`;
    } else if (book.pageCount && endPage > book.pageCount) {
      nextErrors.endPage = `전체 ${book.pageCount}쪽을 넘을 수 없어요.`;
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
        startPageOverride: !isEditing && isOverrideOpen ? startPage : null,
        impression: draft.impression.trim(),
        quoteText: isEditing ? null : draft.quoteText.trim(),
      });
      onOpenChange(false);
      resetDraft();
    } catch (requestError) {
      setSubmitError(requestError.message);
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="record-dialog" showCloseButton={false} finalFocus={finalFocusRef}>
        <DialogHeader className="record-dialog__header">
          <p className="section-kicker">{isEditing ? 'EDIT A RECORD' : 'ADD A RECORD'}</p>
          <DialogTitle>
            {isEditing ? (isPageEditable ? '기록을 고쳐볼까요?' : '감상을 고쳐볼까요?') : '오늘 읽은 자리를 남겨볼까요?'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? `${startPage}쪽부터 읽은 기록을 수정해요.` : `${startPage}쪽부터 읽은 기록으로 남겨요.`}
          </DialogDescription>
        </DialogHeader>

        <form className="record-dialog__form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <Label htmlFor={endPageId}>오늘 끝낸 페이지</Label>
            <Input
              id={endPageId}
              name="endPage"
              type="number"
              min={startPage || 1}
              max={book.pageCount ?? undefined}
              inputMode="numeric"
              value={draft.endPage}
              readOnly={!isPageEditable}
              onChange={(event) => {
                setDraft((current) => ({ ...current, endPage: event.target.value }));
                if (errors.endPage) setErrors((current) => ({ ...current, endPage: undefined }));
              }}
              placeholder={`예: ${startPage + 15}`}
              autoFocus
              aria-invalid={Boolean(errors.endPage)}
            />
            {errors.endPage && <p className="field-error" role="alert">{errors.endPage}</p>}
            {isEditing && !isPageEditable && <p className="field-help">과거 기록은 감상만 바꿀 수 있어요.</p>}
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
              maxLength={1000}
            />
          </div>

          {!isEditing && (
            <div className="field-group">
              <Label htmlFor={quoteId}>도움이 된 글귀 <span>선택</span></Label>
              <textarea
                id={quoteId}
                name="quoteText"
                value={draft.quoteText}
                onChange={(event) => setDraft((current) => ({ ...current, quoteText: event.target.value }))}
                placeholder="나중에 다시 만나고 싶은 문장을 남겨보세요."
                rows={3}
                maxLength={300}
              />
              <p className="field-help">남긴 글귀는 책장 옆에서 다시 읽기를 권해줘요.</p>
            </div>
          )}

          {!isEditing && !isOverrideOpen ? (
            <Button className="record-dialog__override" type="button" variant="link" onClick={() => setIsOverrideOpen(true)}>
              시작 위치 직접 바꾸기
            </Button>
          ) : !isEditing ? (
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
          ) : null}
          {submitError && <p className="field-error" role="alert">{submitError}</p>}

          <div className="record-dialog__actions">
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => handleOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (isEditing ? '기록을 고치는 중이에요…' : '기록을 남기는 중이에요…') : isEditing ? '기록 수정' : '기록 페이지 추가'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
