import { lazy, Suspense, useState } from 'react';
import { ArrowRight, BookOpen, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getContinueBook, getNextStartPage } from '@/lib/reading';

const ThreeBookshelf = lazy(() => import('@/components/bookshelf/ThreeBookshelf').then((module) => ({
  default: module.ThreeBookshelf,
})));

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
              {isArchive && (
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
  onAddBook,
  onSelectBook,
  onContinueReading,
  onRestoreBook,
}) {
  const continueBook = getContinueBook(books);
  const [hoveredBookId, setHoveredBookId] = useState(null);
  const [restoringBookId, setRestoringBookId] = useState(null);
  const [restoreError, setRestoreError] = useState('');

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
        <nav className="bookshelf-preview__nav" aria-label="책장 바로가기">
          <span className="bookshelf-preview__owner">{user.nickname}의 잇장</span>
          <Button
            className="bookshelf-preview__continue"
            type="button"
            variant="ghost"
            disabled={!continueBook}
            onClick={() => continueBook && onContinueReading(continueBook.id)}
          >
            {continueBook ? `${getNextStartPage(continueBook)}쪽 이어 읽기` : '이어 읽을 책 없음'}
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </Button>
          <span className="bookshelf-preview__count">완독 <strong>{completedBooks.length}</strong></span>
          <details className="bookshelf-preview__menu">
            <summary>보관함 <span>{archivedBooks.length}</span></summary>
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
          </details>
          <Button className="reading-bookshelf__add" type="button" onClick={onAddBook}>
            <Plus aria-hidden="true" size={17} strokeWidth={1.8} />
            책 추가
          </Button>
        </nav>
      </header>

      <section className="reading-bookshelf" aria-labelledby="reading-shelf-title">
        <h1 className="sr-only" id="reading-shelf-title">읽고 있는 책 {books.length}권</h1>

        <div className="room-stage">
          <div className="three-bookshelf" aria-label="완독 책장과 읽는 중인 책상">
            <Suspense fallback={<div className="three-bookshelf__loading">책장을 준비하고 있어요.</div>}>
              <ThreeBookshelf
                books={completedBooks}
                hoveredBookId={hoveredBookId}
                onHoverBook={setHoveredBookId}
                onSelectBook={onSelectBook}
              />
            </Suspense>
            <ul className="three-bookshelf__controls" aria-label="완독한 책 선택">
              {completedBooks.map((book, index) => {
                const row = Math.floor(index / 6);
                const booksInRow = Math.min(6, completedBooks.length - row * 6);
                const column = index % 6 + Math.floor((6 - booksInRow) / 2) + 1;

                return (
                  <li key={book.id} style={{ gridColumn: column, gridRow: row + 1 }}>
                    <button
                      className="three-bookshelf__control"
                      type="button"
                      onClick={() => onSelectBook(book.id)}
                      onFocus={() => setHoveredBookId(book.id)}
                      onBlur={() => setHoveredBookId(null)}
                      onMouseEnter={() => setHoveredBookId(book.id)}
                      onMouseLeave={() => setHoveredBookId(null)}
                      aria-label={`${book.title} 서평 및 감상 보기`}
                    >
                      <span className="sr-only">{book.title} 서평 및 감상 보기</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <section className="room-table" aria-label="읽는 중인 책상">
            <div className="room-table__books">
              {books.map((book, index) => (
                <button
                  key={book.id}
                  className="room-table__book"
                  type="button"
                  style={{ '--book-offset': (index % 3) - 1 }}
                  onClick={() => onContinueReading(book.id)}
                  aria-label={`${book.title} 이어 읽기`}
                >
                  <strong>{book.title}</strong>
                  {book.author && <span>{book.author}</span>}
                </button>
              ))}
            </div>
            <div className="room-table__top" aria-hidden="true" />
            <span className="room-table__leg room-table__leg--left" aria-hidden="true" />
            <span className="room-table__leg room-table__leg--right" aria-hidden="true" />
          </section>
        </div>
      </section>
      {restoreError && <p className="status-shelves__error" role="alert">{restoreError}</p>}
    </main>
  );
}
