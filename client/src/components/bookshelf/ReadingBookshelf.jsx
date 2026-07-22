import { lazy, Suspense, useState } from 'react';
import { ArrowRight, BookOpen, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getContinueBook, getLatestRecord, getNextStartPage } from '@/lib/reading';

const ThreeBookshelf = lazy(() => import('@/components/bookshelf/ThreeBookshelf').then((module) => ({
  default: module.ThreeBookshelf,
})));

function ContinueReadingCard({ book, onContinueReading }) {
  const latestRecord = getLatestRecord(book);
  const nextStartPage = getNextStartPage(book);

  return (
    <section className="continue-reading-card" aria-labelledby="continue-reading-title">
      <div className="continue-reading-card__book" aria-hidden="true">
        <span className="continue-reading-card__book-spine">
          <span className="continue-reading-card__book-title">{book.title}</span>
          <span className="continue-reading-card__book-page">{nextStartPage}쪽</span>
        </span>
      </div>
      <div>
        <p className="section-kicker">{latestRecord ? 'PICK UP WHERE YOU LEFT OFF' : 'YOUR FIRST PAGE'}</p>
        <h2 id="continue-reading-title">{book.title}</h2>
        {book.author && <p className="continue-reading-card__author">{book.author}</p>}
        <p className="continue-reading-card__summary">
          {latestRecord
            ? `지난번 ${latestRecord.endPage}쪽까지 읽었어요.`
            : `${book.initialPage}쪽에서 첫 읽기를 시작해 볼까요?`}
        </p>
        {latestRecord?.impression && <p className="continue-reading-card__impression">“{latestRecord.impression}”</p>}
      </div>
      <Button type="button" onClick={() => onContinueReading(book.id)}>
        {nextStartPage}쪽부터 {latestRecord ? '이어 읽기' : '읽기'}
        <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
      </Button>
    </section>
  );
}

function StatusShelf({ title, kicker, books, emptyMessage, onSelectBook, onRestoreBook, restoringBookId, isArchive = false }) {
  return (
    <section className={`status-shelf status-shelf--${isArchive ? 'archive' : 'completed'}`} aria-labelledby={`${kicker.toLowerCase()}-shelf-title`}>
      <div className="status-shelf__header">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2 id={`${kicker.toLowerCase()}-shelf-title`}>{title}</h2>
        </div>
        <span>{books.length}권</span>
      </div>
      {books.length ? (
        <ul className="status-shelf__books">
          {books.map((book) => (
            <li key={book.id} className="status-shelf__item">
              <button
                className="status-book"
                type="button"
                onClick={() => onSelectBook(book.id)}
                aria-label={`${book.title} ${isArchive ? '보관함' : '완독'} 상세 열기`}
              >
                <span className="status-book__spine" aria-hidden="true" />
                <span className="status-book__copy">
                  <strong>{book.title}</strong>
                  {book.author && <small>{book.author}</small>}
                  {!isArchive && book.finalReview && <em>“{book.finalReview}”</em>}
                </span>
              </button>
              {onRestoreBook && (
                <Button
                  className="status-shelf__restore"
                  type="button"
                  variant="link"
                  disabled={restoringBookId === book.id}
                  onClick={() => onRestoreBook(book.id)}
                >
                  {restoringBookId === book.id ? '옮기는 중…' : '다시 읽는 중으로'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="status-shelf__empty">{emptyMessage}</p>
      )}
    </section>
  );
}

export function ReadingBookshelf({
  user,
  books,
  completedBooks = [],
  archivedBooks = [],
  openingBookId,
  bookOpeningPhase,
  openingPageCount,
  onAddBook,
  onSelectBook,
  onContinueReading,
  onRestoreBook,
}) {
  const continueBook = getContinueBook(books);
  const [hoveredBookId, setHoveredBookId] = useState(null);
  const [restoringBookId, setRestoringBookId] = useState(null);
  const [restoreError, setRestoreError] = useState('');
  const openingBook = books.find((book) => book.id === openingBookId);
  const targetPageCount = openingBook?.status === 'COMPLETED'
    ? 5
    : Number(openingBook?.recordCount ?? 0) > 0
      ? 3
      : 0;
  const phaseLabels = {
    pulling: '책 꺼내는 중',
    turning: '표지 정면으로 회전 중',
    opening: '책 여는 중',
    zooming: '상세 화면으로 확대 중',
  };

  async function handleRestoreBook(bookId) {
    setRestoringBookId(bookId);
    setRestoreError('');
    try {
      await onRestoreBook(bookId);
    } catch (error) {
      setRestoreError(error.message);
    } finally {
      setRestoringBookId(null);
    }
  }

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
        <div className="reading-room-layout">
          <div className="room-stage">
            <div className="three-bookshelf" aria-label="읽는 중인 책 선반">
              <Suspense fallback={<div className="three-bookshelf__loading">책장을 준비하고 있어요.</div>}>
                <ThreeBookshelf
                  books={books}
                  selectedBookId={openingBookId}
                  bookOpeningPhase={bookOpeningPhase}
                  openingPageCount={openingPageCount}
                  hoveredBookId={hoveredBookId}
                  onHoverBook={setHoveredBookId}
                  onSelectBook={onSelectBook}
                />
              </Suspense>
              <ul className="three-bookshelf__controls" aria-label="책 선택">
                {books.map((book) => (
                  <li key={book.id}>
                    <button
                      className="three-bookshelf__control"
                      type="button"
                      onClick={() => onSelectBook(book.id)}
                      onFocus={() => setHoveredBookId(book.id)}
                      onBlur={() => setHoveredBookId(null)}
                      onMouseEnter={() => setHoveredBookId(book.id)}
                      onMouseLeave={() => setHoveredBookId(null)}
                      aria-label={`${book.title} 상세 열기`}
                    >
                      <span className="sr-only">{book.title} 상세 열기</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="three-bookshelf__ground" aria-hidden="true" />
              {bookOpeningPhase && (
                <p className="three-bookshelf__motion-debug" role="status" aria-live="polite">
                  <span>{phaseLabels[bookOpeningPhase]}</span>
                  {bookOpeningPhase === 'opening' && targetPageCount > 0 && (
                    <strong>{openingPageCount} / {targetPageCount}장</strong>
                  )}
                </p>
              )}
            </div>
            <p className="three-bookshelf__note">책을 누르면 다음에는 지난 갈피부터 이어 읽을 수 있어요.</p>
          </div>

          <aside className="bookshelf-details">
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

            {continueBook ? (
              <div className="room-stage__continue">
                <ContinueReadingCard book={continueBook} onContinueReading={onContinueReading} />
              </div>
            ) : (
              <div className="room-stage__empty">
                <p className="section-kicker">NEXT PAGE</p>
                <strong>읽고 있는 책을 한 권 꽂아볼까요?</strong>
                <Button type="button" onClick={onAddBook}>읽고 있는 책 추가</Button>
              </div>
            )}

            <div className="status-shelves" aria-label="완독 및 보관 책장">
              <StatusShelf
                title="완독"
                kicker="FINISHED"
                books={completedBooks}
                emptyMessage="완독한 책이 생기면 이 선반에 놓여요."
                onSelectBook={onSelectBook}
                onRestoreBook={handleRestoreBook}
                restoringBookId={restoringBookId}
              />
              <StatusShelf
                title="보관함"
                kicker="RESTING"
                books={archivedBooks}
                emptyMessage="잠시 쉬어 가는 책을 이곳에 둘 수 있어요."
                onSelectBook={onSelectBook}
                onRestoreBook={handleRestoreBook}
                restoringBookId={restoringBookId}
                isArchive
              />
            </div>
            {restoreError && <p className="status-shelves__error" role="alert">{restoreError}</p>}
          </aside>
        </div>
      </section>
    </main>
  );
}
