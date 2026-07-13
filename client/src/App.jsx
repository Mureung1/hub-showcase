import { useEffect, useId, useState } from 'react';
import { ArrowRight, Bookmark, BookOpen, NotebookPen, Plus } from 'lucide-react';

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

const USER_STORAGE_KEY = 'itjang:user';

function readStoredUser() {
  try {
    const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

function OnboardingPage({ onComplete }) {
  const nicknameId = useId();
  const errorId = useId();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      setError('책장에 표시할 이름을 입력해 주세요.');
      return;
    }

    setError('');
    setIsSaving(true);

    window.setTimeout(() => {
      onComplete({
        id: `mock-user-${Date.now()}`,
        nickname: trimmedNickname,
      });
    }, 350);
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

  function handleOpenChange(nextOpen) {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      setDraft({ title: '', author: '', initialPage: '1' });
      setErrors({});
    }
  }

  function handleSubmit(event) {
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

    onCreateBook({
      id: `mock-book-${Date.now()}`,
      title,
      author: draft.author.trim(),
      initialPage,
    });
    handleOpenChange(false);
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

          <div className="add-book-dialog__actions">
            <DialogClose render={<Button type="button" variant="outline" />}>
              취소
            </DialogClose>
            <Button type="submit">
              책장에 꽂기
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

function ReadingBookshelf({ user, books, onAddBook }) {
  return (
    <main className="bookshelf-preview">
      <header className="bookshelf-preview__header">
        <a href="/bookshelf" aria-label="잇장 홈">
          <BookOpen aria-hidden="true" size={19} strokeWidth={1.8} />
          <span>잇장</span>
        </a>
        <span>{user.nickname}의 잇장</span>
      </header>

      <section className="reading-bookshelf" aria-labelledby="reading-shelf-title">
        <div className="reading-bookshelf__heading">
          <div>
            <p className="section-kicker">NOW READING</p>
            <h1 id="reading-shelf-title">읽고 있는 책</h1>
            <p>{books.length}권의 책이 다음 장을 기다리고 있어요.</p>
          </div>
          <Button className="reading-bookshelf__add" type="button" onClick={onAddBook}>
            <Plus aria-hidden="true" size={17} strokeWidth={1.8} />
            책 추가
          </Button>
        </div>

        <div className="reading-shelf" aria-label="읽는 중인 책 선반">
          <ul className="reading-shelf__books">
            {books.map((book) => (
              <li key={book.id}>
                <article className="book-spine">
                  <p className="book-spine__title">{book.title}</p>
                  {book.author && <p className="book-spine__author">{book.author}</p>}
                  <span className="book-spine__bookmark">{book.initialPage}쪽부터</span>
                </article>
              </li>
            ))}
          </ul>
        </div>
        <p className="reading-shelf__note">책을 누르면 다음에는 지난 갈피부터 이어 읽을 수 있어요.</p>
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(() => readStoredUser());
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [books, setBooks] = useState([]);

  useEffect(() => {
    if (user && window.location.pathname === '/') {
      window.history.replaceState({}, '', '/bookshelf');
    }
  }, [user]);

  function handleOnboardingComplete(newUser) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    window.history.pushState({}, '', '/bookshelf');
    setUser(newUser);
  }

  function handleCreateBook(newBook) {
    setBooks((currentBooks) => [newBook, ...currentBooks]);
  }

  if (!user) {
    return <OnboardingPage onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      {books.length ? (
        <ReadingBookshelf user={user} books={books} onAddBook={() => setIsAddBookOpen(true)} />
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
