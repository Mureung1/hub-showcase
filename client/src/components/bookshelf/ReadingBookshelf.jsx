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

export function ReadingBookshelf({
  user,
  books,
  openingBookId,
  bookOpeningPhase,
  openingPageCount,
  onAddBook,
  onSelectBook,
  onContinueReading,
}) {
  const continueBook = getContinueBook(books);
  const [hoveredBookId, setHoveredBookId] = useState(null);
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
        <ContinueReadingCard book={continueBook} onContinueReading={onContinueReading} />
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
      </section>
    </main>
  );
}
