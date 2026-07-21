import { useEffect, useId, useState } from 'react';
import { Archive, ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, NotebookPen, Plus, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReadingBookshelf } from '@/components/bookshelf/ReadingBookshelf';
import { ReadingRecordList } from '@/components/bookshelf/ReadingRecordList';
import { SessionRecordDialog } from '@/components/bookshelf/SessionRecordDialog';
import {
  getLatestRecord,
  getNextStartPage,
  getRecords,
} from '@/lib/reading';
import {
  createBook,
  createReadingRecord,
  createUser,
  deleteReadingRecord,
  getBook,
  getBooks,
  updateBookStatus,
  updateReadingRecord,
} from '@/lib/api';

const USER_STORAGE_KEY = 'itjang:user';

function readStoredUser() {
  try {
    const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
    const user = storedUser ? JSON.parse(storedUser) : null;

    // 이전 mock UI가 남긴 문자열 userId로 서버 API를 호출하지 않는다.
    if (!user || !Number.isInteger(user.id) || user.id < 1) {
      window.localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }

    return user;
  } catch {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

function OnboardingPage({ onComplete }) {
  const nicknameId = useId();
  const errorId = useId();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      setError('책장에 표시할 이름을 입력해 주세요.');
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      const user = await createUser({ nickname: trimmedNickname });
      onComplete(user);
    } catch (requestError) {
      setError(requestError.message);
      setIsSaving(false);
    }
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-header" aria-label="잇장">
        <BookOpen aria-hidden="true" size={19} strokeWidth={1.8} />
        <span>잇장</span>
      </header>

      <section className="onboarding-content" aria-labelledby="onboarding-title">
        <div className="onboarding-copy">
          <p className="section-kicker">FIRST PAGE</p>
          <h1 id="onboarding-title">
            다시 펼칠 책을
            <br />
            한 권씩 모아봐요.
          </h1>
          <p className="onboarding-description">
            마지막 책갈피에서 다시 읽기를 시작해요.
            <br />
            읽은 자리에는 짧은 생각도 남길 수 있어요.
          </p>
          <p className="brand-origin">
            <strong>잇장</strong>은 읽은 장을 잇고, 다음 장으로 이어가는 나의 책장이에요.
          </p>
        </div>

        <form className="onboarding-form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <Label htmlFor={nicknameId}>잇장에 표시할 이름</Label>
            <Input
              id={nicknameId}
              name="nickname"
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                if (error) setError('');
              }}
              placeholder="예: 다정"
              autoComplete="nickname"
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            />
            {error ? (
              <p className="field-error" id={errorId} role="alert">
                {error}
              </p>
            ) : (
              <p className="field-help">이 이름은 내 책장에만 표시돼요.</p>
            )}
          </div>

          <Button className="onboarding-submit" type="submit" size="lg" disabled={isSaving}>
            {isSaving ? '잇장을 만드는 중이에요…' : '내 잇장 시작하기'}
            {!isSaving && <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />}
          </Button>
        </form>
      </section>

      <aside className="onboarding-shelf" aria-label="비어 있는 첫 책장">
        <div className="onboarding-shelf__books" aria-hidden="true">
          <span className="shelf-book shelf-book--clay">첫 기록</span>
          <span className="shelf-book shelf-book--ink">다음 장</span>
          <span className="shelf-book shelf-book--linen" />
        </div>
        <p>첫 번째 책이 들어올 자리를 비워 두었어요.</p>
      </aside>

      <section className="onboarding-values" aria-labelledby="onboarding-values-title">
        <div className="onboarding-values__intro">
          <p className="section-kicker">WHAT YOU WILL KEEP</p>
          <h2 id="onboarding-values-title">한 번 읽고 끝나지 않는 독서</h2>
          <p>잇장은 읽은 시간보다, 다시 돌아온 자리와 그때의 생각을 소중히 모아요.</p>
        </div>
        <ul className="onboarding-values__list">
          <li>
            <Bookmark aria-hidden="true" size={20} strokeWidth={1.7} />
            <div>
              <h3>마지막 갈피에서 다시</h3>
              <p>읽다 멈춘 페이지를 기억해 두었다가, 다음에는 바로 그 다음 장을 열어요.</p>
            </div>
          </li>
          <li>
            <NotebookPen aria-hidden="true" size={20} strokeWidth={1.7} />
            <div>
              <h3>한 장씩 쌓이는 생각</h3>
              <p>끝낸 페이지와 짧은 감상을 남기면, 그날의 독서가 책 속 한 장의 기록이 돼요.</p>
            </div>
          </li>
          <li>
            <BookOpen aria-hidden="true" size={20} strokeWidth={1.7} />
            <div>
              <h3>나만의 읽기 흔적</h3>
              <p>채워지는 책장과 기록을 보며, 내 방식으로 이어 온 독서의 흐름을 돌아봐요.</p>
            </div>
          </li>
        </ul>
      </section>
    </main>
  );
}

function AddBookDialog({ open, onOpenChange, onCreateBook }) {
  const titleId = useId();
  const authorId = useId();
  const initialPageId = useId();
  const [draft, setDraft] = useState({ title: '', author: '', initialPage: '1' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(nextOpen) {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      setDraft({ title: '', author: '', initialPage: '1' });
      setErrors({});
      setSubmitError('');
      setIsSaving(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const title = draft.title.trim();
    const initialPage = Number(draft.initialPage);
    const nextErrors = {};

    if (!title) {
      nextErrors.title = '책 제목을 입력해 주세요.';
    }

    if (!Number.isInteger(initialPage) || initialPage < 1) {
      nextErrors.initialPage = '1 이상의 페이지를 입력해 주세요.';
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    setSubmitError('');

    try {
      await onCreateBook({ title, author: draft.author.trim(), initialPage });
      handleOpenChange(false);
    } catch (requestError) {
      setSubmitError(requestError.message);
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="add-book-dialog" showCloseButton={false}>
        <DialogHeader className="add-book-dialog__header">
          <p className="section-kicker">ADD A BOOK</p>
          <DialogTitle>읽고 있는 책을 꽂아볼까요?</DialogTitle>
          <DialogDescription>
            먼저 책과 시작한 페이지를 적어 주세요. 마지막 갈피는 읽은 뒤에 남길 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <form className="add-book-dialog__form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <Label htmlFor={titleId}>책 제목</Label>
            <Input
              id={titleId}
              name="title"
              value={draft.title}
              onChange={(event) => {
                setDraft((current) => ({ ...current, title: event.target.value }));
                if (errors.title && event.target.value.trim()) {
                  setErrors((current) => ({ ...current, title: undefined }));
                }
              }}
              placeholder="예: 아주 작은 습관의 힘"
              autoFocus
              required
              aria-invalid={Boolean(errors.title)}
              onBlur={() => {
                if (!draft.title.trim()) setErrors((current) => ({ ...current, title: '책 제목을 입력해 주세요.' }));
              }}
            />
            {errors.title && <p className="field-error" role="alert">{errors.title}</p>}
          </div>
          <div className="field-group">
            <Label htmlFor={authorId}>저자 <span>선택</span></Label>
            <Input
              id={authorId}
              name="author"
              value={draft.author}
              onChange={(event) => setDraft((current) => ({ ...current, author: event.target.value }))}
              placeholder="예: 제임스 클리어"
            />
          </div>
          <div className="field-group field-group--page">
            <Label htmlFor={initialPageId}>시작 페이지</Label>
            <Input
              id={initialPageId}
              name="initialPage"
              type="number"
              min="1"
              inputMode="numeric"
              value={draft.initialPage}
              onChange={(event) => {
                setDraft((current) => ({ ...current, initialPage: event.target.value }));
                if (errors.initialPage && Number.isInteger(Number(event.target.value)) && Number(event.target.value) >= 1) {
                  setErrors((current) => ({ ...current, initialPage: undefined }));
                }
              }}
              aria-invalid={Boolean(errors.initialPage)}
            />
            {errors.initialPage ? (
              <p className="field-error" role="alert">{errors.initialPage}</p>
            ) : (
              <p className="field-help">처음부터 읽는다면 1쪽 그대로 두면 돼요.</p>
            )}
          </div>
          {submitError && <p className="field-error" role="alert">{submitError}</p>}

          <div className="add-book-dialog__actions">
            <DialogClose render={<Button type="button" variant="outline" />}>
              취소
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '책장에 꽂는 중이에요…' : '책장에 꽂기'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmptyBookshelf({ user, onAddBook }) {
  return (
    <main className="bookshelf-preview">
      <header className="bookshelf-preview__header">
        <a href="/bookshelf" aria-label="잇장 홈">
          <BookOpen aria-hidden="true" size={19} strokeWidth={1.8} />
          <span>잇장</span>
        </a>
        <span>{user.nickname}의 잇장</span>
      </header>

      <section className="empty-bookshelf" aria-labelledby="empty-shelf-title">
        <p className="section-kicker">MY SHELF</p>
        <h1 id="empty-shelf-title">첫 책이 들어올 자리예요.</h1>
        <p>
          지금 읽고 있는 책을 등록하면, 다음부터 마지막 책갈피에서 바로 이어 읽을 수
          있어요.
        </p>
        <Button className="empty-bookshelf__cta" size="lg" type="button" onClick={onAddBook}>
          <Plus aria-hidden="true" size={18} strokeWidth={1.8} />
          읽고 있는 책 추가
        </Button>
      </section>

      <div className="empty-bookshelf__wood" aria-hidden="true">
        <span />
      </div>
    </main>
  );
}

function DeleteRecordDialog({ record, open, onOpenChange, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setIsDeleting(false);
      setError('');
    }
  }, [open]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
      : '마지막 책갈피를 유지한 채 읽고 있는 책장으로 돌아가요.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

function BookDetailScreen({
  book,
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
          ) : book.status === 'ARCHIVED' ? (
            <Button type="button" variant="outline" onClick={() => setStatusMode('resume')}>
              <RotateCcw aria-hidden="true" size={16} strokeWidth={1.8} />
              다시 읽는 중으로
            </Button>
          ) : (
            <span className="book-status__review-label">마지막 서평 페이지가 열려 있어요.</span>
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
          }
        }}
        onSave={async (record) => {
          if (editingRecord) {
            await onUpdateRecord(book.id, editingRecord.record.id, record);
          } else {
            await onSaveRecord(book.id, record);
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

export default function App() {
  const [user, setUser] = useState(() => readStoredUser());
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [completedBooks, setCompletedBooks] = useState([]);
  const [archivedBooks, setArchivedBooks] = useState([]);
  const [isBooksLoading, setIsBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState('');
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [bookDetail, setBookDetail] = useState(null);
  const [isBookDetailLoading, setIsBookDetailLoading] = useState(false);
  const [bookDetailError, setBookDetailError] = useState('');
  const [shouldStartReading, setShouldStartReading] = useState(false);

  useEffect(() => {
    if (user && window.location.pathname === '/') {
      window.history.replaceState({}, '', '/bookshelf');
    }
  }, [user]);

  useEffect(() => {
    if (!selectedBookId || !user) return undefined;

    let isCancelled = false;
    setIsBookDetailLoading(true);
    setBookDetailError('');
    setBookDetail(null);

    getBook(selectedBookId, user.id)
      .then((detail) => {
        if (!isCancelled) setBookDetail(detail);
      })
      .catch((requestError) => {
        if (!isCancelled) setBookDetailError(requestError.message);
      })
      .finally(() => {
        if (!isCancelled) setIsBookDetailLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedBookId, user]);

  useEffect(() => {
    if (!user) return undefined;

    let isCancelled = false;
    setIsBooksLoading(true);
    setBooksError('');

    Promise.all([
      getBooks(user.id, 'READING'),
      getBooks(user.id, 'COMPLETED'),
      getBooks(user.id, 'ARCHIVED'),
    ])
      .then(([readingShelf, completedShelf, archivedShelf]) => {
        if (!isCancelled) {
          setBooks(readingShelf.books);
          setCompletedBooks(completedShelf.books);
          setArchivedBooks(archivedShelf.books);
        }
      })
      .catch((requestError) => {
        if (!isCancelled) setBooksError(requestError.message);
      })
      .finally(() => {
        if (!isCancelled) setIsBooksLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  function handleOnboardingComplete(newUser) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    window.history.pushState({}, '', '/bookshelf');
    setUser(newUser);
  }

  function openBook(bookId, startInReadingContext = false) {
    setShouldStartReading(startInReadingContext);
    setSelectedBookId(bookId);
  }

  async function handleCreateBook(input) {
    const newBook = await createBook({ userId: user.id, ...input });
    setBooks((currentBooks) => [newBook, ...currentBooks]);
    openBook(newBook.id);
  }

  async function handleSaveRecord(bookId, recordInput) {
    await createReadingRecord({ bookId, userId: user.id, ...recordInput });
    await refreshBookData(bookId);
  }

  async function refreshShelves() {
    const [readingShelf, completedShelf, archivedShelf] = await Promise.all([
      getBooks(user.id, 'READING'),
      getBooks(user.id, 'COMPLETED'),
      getBooks(user.id, 'ARCHIVED'),
    ]);
    setBooks(readingShelf.books);
    setCompletedBooks(completedShelf.books);
    setArchivedBooks(archivedShelf.books);
  }

  async function refreshBookData(bookId) {
    const [, refreshedDetail] = await Promise.all([
      refreshShelves(),
      getBook(bookId, user.id),
    ]);
    setBookDetail(refreshedDetail);
  }

  async function handleUpdateStatus(bookId, statusInput) {
    await updateBookStatus({ bookId, userId: user.id, ...statusInput });
    await refreshBookData(bookId);
  }

  async function handleRestoreBook(bookId) {
    await updateBookStatus({ bookId, userId: user.id, status: 'READING' });
    await refreshShelves();
  }

  async function handleUpdateRecord(bookId, recordId, recordInput) {
    await updateReadingRecord({ bookId, recordId, userId: user.id, ...recordInput });
    await refreshBookData(bookId);
  }

  async function handleDeleteRecord(bookId, recordId) {
    await deleteReadingRecord({ bookId, recordId, userId: user.id });
    await refreshBookData(bookId);
  }

  function handleSelectBook(bookId) {
    openBook(bookId);
  }

  function handleContinueReading(bookId) {
    openBook(bookId, true);
  }

  if (!user) {
    return <OnboardingPage onComplete={handleOnboardingComplete} />;
  }

  if (isBooksLoading) {
    return <main className="bookshelf-preview"><p className="bookshelf-status">책장을 불러오고 있어요.</p></main>;
  }

  if (booksError) {
    return <main className="bookshelf-preview"><p className="bookshelf-status field-error" role="alert">{booksError}</p></main>;
  }

  return (
    <>
      {selectedBookId && isBookDetailLoading ? (
        <main className="book-detail"><p className="bookshelf-status">책의 기록을 불러오고 있어요.</p></main>
      ) : selectedBookId && bookDetailError ? (
        <main className="book-detail"><p className="bookshelf-status field-error" role="alert">{bookDetailError}</p></main>
      ) : selectedBookId && bookDetail ? (
        <BookDetailScreen
          key={`${bookDetail.id}-${shouldStartReading}`}
          book={bookDetail}
          startInReadingContext={shouldStartReading}
          onBackToBookshelf={() => {
            setSelectedBookId(null);
            setShouldStartReading(false);
          }}
          onSaveRecord={handleSaveRecord}
          onUpdateRecord={handleUpdateRecord}
          onDeleteRecord={handleDeleteRecord}
          onUpdateStatus={handleUpdateStatus}
        />
      ) : books.length || completedBooks.length || archivedBooks.length ? (
        <ReadingBookshelf
          user={user}
          books={books}
          completedBooks={completedBooks}
          archivedBooks={archivedBooks}
          onAddBook={() => setIsAddBookOpen(true)}
          onSelectBook={handleSelectBook}
          onContinueReading={handleContinueReading}
          onRestoreBook={handleRestoreBook}
        />
      ) : (
        <EmptyBookshelf user={user} onAddBook={() => setIsAddBookOpen(true)} />
      )}
      <AddBookDialog
        open={isAddBookOpen}
        onOpenChange={setIsAddBookOpen}
        onCreateBook={handleCreateBook}
      />
    </>
  );
}
