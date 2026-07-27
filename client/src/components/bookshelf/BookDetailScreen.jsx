import { useEffect, useId, useState } from 'react';
import { Archive, ArrowLeft, ArrowRight, BookOpen, Check, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ReadingRecordList } from '@/components/bookshelf/ReadingRecordList';
import { SessionRecordDialog } from '@/components/bookshelf/SessionRecordDialog';
import { TimerPanel } from '@/components/bookshelf/TimerPanel';
import {
  getLatestRecord,
  getNextStartPage,
  getRecords,
} from '@/lib/reading';

function DeleteRecordDialog({ record, open, onOpenChange, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setIsDeleting(false);
      setError('');
    }
  }, [open]);

  function handleOpenChange(nextOpen) {
    if (!nextOpen && isDeleting) return;
    onOpenChange(nextOpen);
  }

  async function handleConfirm() {
    setIsDeleting(true);
    setError('');
    try {
      await onConfirm();
    } catch (requestError) {
      setError(requestError.message);
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="record-dialog record-delete-dialog" showCloseButton={false}>
        <DialogHeader className="record-dialog__header">
          <p className="section-kicker">DELETE A RECORD</p>
          <DialogTitle>이 기록을 지울까요?</DialogTitle>
          <DialogDescription>
            {record ? `${record.startPage}–${record.endPage}쪽 기록을 지우면 다음 책갈피가 다시 계산돼요.` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="record-dialog__form">
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="record-dialog__actions">
            <Button type="button" variant="outline" disabled={isDeleting} onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleConfirm}>
              {isDeleting ? '기록을 지우는 중이에요…' : '기록 삭제'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookStatusDialog({ book, mode, open, onOpenChange, onConfirm }) {
  const reviewId = useId();
  const [review, setReview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const isComplete = mode === 'complete';
  const isArchive = mode === 'archive';

  useEffect(() => {
    if (open) {
      setReview(book?.finalReview ?? '');
      setIsSaving(false);
      setError('');
    }
  }, [book, open]);

  function handleOpenChange(nextOpen) {
    if (!nextOpen && isSaving) return;
    onOpenChange(nextOpen);
  }

  async function handleConfirm() {
    setIsSaving(true);
    setError('');
    try {
      await onConfirm({
        status: isComplete ? 'COMPLETED' : isArchive ? 'ARCHIVED' : 'READING',
        finalReview: isComplete ? review : '',
      });
      onOpenChange(false);
    } catch (requestError) {
      setError(requestError.message);
      setIsSaving(false);
    }
  }

  const title = isComplete ? '이 책을 완독으로 옮길까요?' : isArchive ? '책을 잠시 보관할까요?' : '다시 읽는 중으로 옮길까요?';
  const description = isComplete
    ? '완독한 책은 완독 선반에 놓이고, 긴 서평은 지금 쓰지 않아도 괜찮아요.'
    : isArchive
      ? '기록과 마지막 책갈피는 그대로 남아요. 언제든 다시 꺼낼 수 있어요.'
      : book?.status === 'COMPLETED'
        ? '완독 서평과 마지막 책갈피를 유지한 채 읽고 있는 책장으로 돌아가요.'
        : '마지막 책갈피를 유지한 채 읽고 있는 책장으로 돌아가요.';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="status-dialog" showCloseButton={false}>
        <DialogHeader className="status-dialog__header">
          <p className="section-kicker">{isComplete ? 'FINISH THE BOOK' : isArchive ? 'PUT ASIDE' : 'BRING IT BACK'}</p>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="status-dialog__form">
          {isComplete && (
            <div className="field-group">
              <Label htmlFor={reviewId}>완독 서평 <span>선택</span></Label>
              <textarea
                id={reviewId}
                value={review}
                onChange={(event) => setReview(event.target.value)}
                placeholder="한 권을 다 읽은 뒤의 생각을 남겨 보세요. 나중에 써도 괜찮아요."
                rows={5}
                maxLength={10000}
              />
              <p className="field-help">세션 감상과 달리, 책 전체를 돌아보는 긴 글이에요.</p>
            </div>
          )}
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="status-dialog__actions">
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="button" disabled={isSaving} onClick={handleConfirm}>
              {isSaving ? '저장 중이에요…' : isComplete ? '완독으로 옮기기' : isArchive ? '보관하기' : '다시 읽는 중으로'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BookDetailScreen({
  book,
  userId,
  quoteExposureId,
  startInReadingContext,
  onBackToBookshelf,
  onSaveRecord,
  onUpdateRecord,
  onDeleteRecord,
  onUpdateStatus,
}) {
  const [isReadingContextActive, setIsReadingContextActive] = useState(startInReadingContext);
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [statusMode, setStatusMode] = useState(null);
  const [pendingDurationSeconds, setPendingDurationSeconds] = useState(null);
  const records = getRecords(book);
  const latestRecord = getLatestRecord(book);
  const nextStartPage = getNextStartPage(book);

  return (
    <main className="book-detail">
      <header className="book-detail__header">
        <a href="/bookshelf" aria-label="잇장 홈">
          <BookOpen aria-hidden="true" size={19} strokeWidth={1.8} />
          <span>잇장</span>
        </a>
        <Button type="button" variant="ghost" onClick={onBackToBookshelf}>
          <ArrowLeft aria-hidden="true" size={17} strokeWidth={1.8} />
          책장으로 돌아가기
        </Button>
      </header>

      <article className="reading-note" aria-labelledby="book-detail-title">
        <div className="reading-note__book-object" aria-hidden="true">
          <div className="reading-note__book-cover">
            <BookOpen size={27} strokeWidth={1.35} />
            <span>READING NOTE</span>
          </div>
          <div className="reading-note__book-pages">
            <span />
            <span />
            <span />
          </div>
        </div>
        <p className="section-kicker">READING NOTE</p>
        <h1 id="book-detail-title">{book.title}</h1>
        {book.author && <p className="reading-note__author">{book.author}</p>}

        <section className="bookmark-summary" aria-labelledby="bookmark-summary-title">
          <p className="bookmark-summary__label" id="bookmark-summary-title">다음 책갈피</p>
          <p className="bookmark-summary__page">
            {latestRecord ? `지난번 ${latestRecord.endPage}쪽까지 읽었어요.` : `${book.initialPage}쪽부터 시작해 볼까요?`}
          </p>
          <p>다음에는 {nextStartPage}쪽부터 이어 읽을 수 있어요.</p>
        </section>

        <section className={`book-status book-status--${book.status.toLowerCase()}`} aria-label="책 상태">
          <div>
            <p className="section-kicker">BOOK STATUS</p>
            <strong>{book.status === 'COMPLETED' ? '완독한 책' : book.status === 'ARCHIVED' ? '잠시 보관한 책' : '읽는 중인 책'}</strong>
          </div>
          {book.status === 'READING' ? (
            <div className="book-status__actions">
              <Button type="button" variant="outline" onClick={() => setStatusMode('archive')}>
                <Archive aria-hidden="true" size={16} strokeWidth={1.8} />
                잠시 보관하기
              </Button>
              <Button type="button" variant="outline" onClick={() => setStatusMode('complete')}>
                <Check aria-hidden="true" size={16} strokeWidth={1.8} />
                완독으로 옮기기
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => setStatusMode('resume')}>
              <RotateCcw aria-hidden="true" size={16} strokeWidth={1.8} />
              다시 읽는 중으로
            </Button>
          )}
        </section>

        {book.status === 'COMPLETED' && (
          <section className="final-review-page" aria-labelledby="final-review-title">
            <p className="section-kicker">FINAL REVIEW</p>
            <h2 id="final-review-title">한 권의 마지막 장</h2>
            <p>{book.finalReview || '완독 서평은 아직 남기지 않았어요. 나중에 천천히 돌아와도 괜찮아요.'}</p>
          </section>
        )}

        {book.status === 'READING' && (
          <section className="start-reading-panel" aria-labelledby="start-reading-title">
            <p className="section-kicker">NEXT READING</p>
            <h2 id="start-reading-title">{nextStartPage}쪽부터 이어 읽어볼까요?</h2>
            {isReadingContextActive ? (
              <>
                <p>다 읽고 돌아오면 기록을 남겨 주세요. 타이머 없이도 기록할 수 있어요.</p>
                <TimerPanel
                  userId={userId}
                  bookId={book.id}
                  onEndSession={(durationSeconds) => {
                    setPendingDurationSeconds(durationSeconds);
                    setIsRecordDialogOpen(true);
                  }}
                />
                <Button type="button" onClick={() => setIsRecordDialogOpen(true)}>이번 읽기 기록 남기기</Button>
              </>
            ) : (
              <Button type="button" onClick={() => setIsReadingContextActive(true)}>
                {nextStartPage}쪽부터 이어 읽기
                <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
              </Button>
            )}
          </section>
        )}

        <ReadingRecordList
          records={records}
          latestRecord={latestRecord}
          onEditRecord={(record) => setEditingRecord({
            record,
            canEditPage: record.id === latestRecord?.id,
          })}
          onDeleteRecord={setDeletingRecord}
        />
      </article>
      <SessionRecordDialog
        book={book}
        record={editingRecord?.record}
        canEditPage={editingRecord?.canEditPage ?? true}
        open={isRecordDialogOpen || Boolean(editingRecord)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setIsRecordDialogOpen(false);
            setEditingRecord(null);
            setPendingDurationSeconds(null);
          }
        }}
        onSave={async (record) => {
          if (editingRecord) {
            await onUpdateRecord(book.id, editingRecord.record.id, record);
          } else {
            await onSaveRecord(book.id, {
              ...record,
              readingDurationSeconds: pendingDurationSeconds,
              quoteExposureId,
            });
            setPendingDurationSeconds(null);
            setIsReadingContextActive(false);
          }
        }}
      />
      <DeleteRecordDialog
        record={deletingRecord}
        open={Boolean(deletingRecord)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeletingRecord(null);
        }}
        onConfirm={async () => {
          await onDeleteRecord(book.id, deletingRecord.id);
          setDeletingRecord(null);
        }}
      />
      <BookStatusDialog
        book={book}
        mode={statusMode}
        open={Boolean(statusMode)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setStatusMode(null);
        }}
        onConfirm={async (statusInput) => {
          await onUpdateStatus(book.id, statusInput);
          if (statusInput.status === 'ARCHIVED') onBackToBookshelf();
        }}
      />
    </main>
  );
}
