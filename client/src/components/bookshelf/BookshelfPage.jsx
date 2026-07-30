import { useEffect, useRef, useState } from 'react';
import { BookOpen, LogOut, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AddBookDialog } from '@/components/bookshelf/AddBookDialog';
import { BookDetailScreen } from '@/components/bookshelf/BookDetailScreen';
import { getReadingActivityRange } from '@/components/bookshelf/ReadingActivityCalendar';
import { ReadingBookshelf } from '@/components/bookshelf/ReadingBookshelf';
import { prefersReducedMotion } from '@/lib/motion';
import {
  createBook,
  createQuoteExposure,
  createReadingRecord,
  deleteReadingRecord,
  getBook,
  getBooks,
  getRandomQuote,
  getReadingActivity,
  openQuoteExposure,
  updateBookStatus,
  updateReadingRecord,
} from '@/lib/api';

function SessionActions({ user, isLoggingOut, logoutError, onLogout }) {
  return (
    <div className="bookshelf-session">
      <div>
        <span>{user.nickname}의 잇장</span>
        <Button type="button" variant="ghost" disabled={isLoggingOut} onClick={onLogout}>
          <LogOut aria-hidden="true" size={16} strokeWidth={1.8} />
          {isLoggingOut ? '로그아웃 중…' : '로그아웃'}
        </Button>
      </div>
      {logoutError && <p className="field-error" role="alert">{logoutError}</p>}
    </div>
  );
}

function EmptyBookshelf({ sessionActions, onAddBook }) {
  return (
    <main className="bookshelf-preview">
      <header className="bookshelf-preview__header">
        <a href="/bookshelf" aria-label="잇장 홈">
          <BookOpen aria-hidden="true" size={19} strokeWidth={1.8} />
          <span>잇장</span>
        </a>
        {sessionActions}
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

export function BookshelfPage({ user, isLoggingOut = false, logoutError = '', onLogout }) {
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [completedBooks, setCompletedBooks] = useState([]);
  const [archivedBooks, setArchivedBooks] = useState([]);
  const [isBooksLoading, setIsBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState('');
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [openingBookId, setOpeningBookId] = useState(null);
  const [bookOpeningPhase, setBookOpeningPhase] = useState(null);
  const [openingPageCount, setOpeningPageCount] = useState(0);
  const openingTimerRef = useRef(null);
  const [bookDetail, setBookDetail] = useState(null);
  const [isBookDetailLoading, setIsBookDetailLoading] = useState(false);
  const [bookDetailError, setBookDetailError] = useState('');
  const [shouldStartReading, setShouldStartReading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteExposure, setQuoteExposure] = useState(null);
  const [activeQuoteExposureId, setActiveQuoteExposureId] = useState(null);
  const [readingActivity, setReadingActivity] = useState(null);
  const [isReadingActivityLoading, setIsReadingActivityLoading] = useState(true);
  const [readingActivityError, setReadingActivityError] = useState('');
  const [readingActivityRequest, setReadingActivityRequest] = useState(0);

  useEffect(() => {
    return () => {
      if (openingTimerRef.current) window.clearTimeout(openingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedBookId || !user) return undefined;

    let isCancelled = false;
    setIsBookDetailLoading(true);
    setBookDetailError('');
    setBookDetail(null);

    getBook(selectedBookId)
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

    getBooks()
      .then((shelf) => {
        if (!isCancelled) {
          setBooks(shelf.reading);
          setCompletedBooks(shelf.completed);
          setArchivedBooks(shelf.archived);
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

  useEffect(() => {
    if (!user) return undefined;
    let isCancelled = false;
    setIsReadingActivityLoading(true);
    setReadingActivityError('');
    getReadingActivity(getReadingActivityRange())
      .then((activity) => {
        if (!isCancelled) setReadingActivity(activity);
      })
      .catch((requestError) => {
        if (!isCancelled) setReadingActivityError(requestError.message);
      })
      .finally(() => {
        if (!isCancelled) setIsReadingActivityLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [user, readingActivityRequest]);

  useEffect(() => {
    if (!user) return undefined;
    let isCancelled = false;
    getRandomQuote()
      .then((nextQuote) => {
        if (!isCancelled) setQuote(nextQuote);
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!quote || selectedBookId || isBooksLoading || !books.some((book) => book.id === quote.bookId)) {
      setQuoteExposure(null);
      return undefined;
    }
    let isCancelled = false;
    createQuoteExposure(quote.id)
      .then((exposure) => {
        if (!isCancelled) setQuoteExposure(exposure);
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [quote, selectedBookId, isBooksLoading, books]);

  function openBook(bookId, startInReadingContext = false, bookOverride = null) {
    if (openingTimerRef.current) {
      window.clearTimeout(openingTimerRef.current);
      openingTimerRef.current = null;
    }

    const openingBook = bookOverride ?? [...books, ...completedBooks, ...archivedBooks].find((book) => book.id === bookId);
    if (openingBook?.status !== 'READING') {
      setShouldStartReading(false);
      setSelectedBookId(bookId);
      setOpeningBookId(null);
      setBookOpeningPhase(null);
      setOpeningPageCount(0);
      return;
    }
    if (prefersReducedMotion()) {
      setShouldStartReading(startInReadingContext);
      setSelectedBookId(bookId);
      setOpeningBookId(null);
      setBookOpeningPhase(null);
      setOpeningPageCount(0);
      return;
    }
    const recordCount = Number(openingBook?.recordCount ?? 0);
    const pagesToTurn = openingBook?.status === 'COMPLETED' ? 5 : recordCount > 0 ? 3 : 0;

    function zoomAndShowDetail() {
      setBookOpeningPhase('zooming');
      openingTimerRef.current = window.setTimeout(() => {
        setSelectedBookId(bookId);
        setOpeningBookId(null);
        setBookOpeningPhase(null);
        setOpeningPageCount(0);
        openingTimerRef.current = null;
      }, 520);
    }

    function turnNextPage(pageNumber) {
      if (pageNumber > pagesToTurn) {
        openingTimerRef.current = window.setTimeout(zoomAndShowDetail, 700);
        return;
      }

      openingTimerRef.current = window.setTimeout(() => {
        setOpeningPageCount(pageNumber);
        turnNextPage(pageNumber + 1);
      }, 700);
    }

    setShouldStartReading(startInReadingContext);
    setOpeningBookId(bookId);
    setBookOpeningPhase('pulling');
    setOpeningPageCount(0);
    openingTimerRef.current = window.setTimeout(() => {
      setBookOpeningPhase('turning');
      openingTimerRef.current = window.setTimeout(() => {
        setBookOpeningPhase('opening');
        if (pagesToTurn > 0) {
          turnNextPage(1);
        } else {
          openingTimerRef.current = window.setTimeout(zoomAndShowDetail, 700);
        }
      }, 520);
    }, 420);
  }

  async function handleCreateBook(input) {
    const newBook = await createBook(input);
    setBooks((currentBooks) => [newBook, ...currentBooks]);
    openBook(newBook.id, false, newBook);
  }

  async function handleSaveRecord(bookId, recordInput) {
    await createReadingRecord({ bookId, ...recordInput });
    if (recordInput.quoteExposureId) setActiveQuoteExposureId(null);
    await refreshBookData(bookId);
    if (recordInput.quoteText) {
      await getRandomQuote().then(setQuote).catch(() => {});
    }
    setReadingActivityRequest((request) => request + 1);
  }

  async function refreshShelves() {
    const shelf = await getBooks();
    setBooks(shelf.reading);
    setCompletedBooks(shelf.completed);
    setArchivedBooks(shelf.archived);
  }

  async function refreshBookData(bookId) {
    const [, refreshedDetail] = await Promise.all([
      refreshShelves(),
      getBook(bookId),
    ]);
    setBookDetail(refreshedDetail);
  }

  async function handleUpdateStatus(bookId, statusInput) {
    await updateBookStatus({ bookId, ...statusInput });
    await refreshBookData(bookId);
  }

  async function handleRestoreBook(bookId) {
    await updateBookStatus({ bookId, status: 'READING' });
    await refreshShelves();
  }

  async function handleUpdateRecord(bookId, recordId, recordInput) {
    await updateReadingRecord({ bookId, recordId, ...recordInput });
    await refreshBookData(bookId);
  }

  async function handleDeleteRecord(bookId, recordId) {
    await deleteReadingRecord({ bookId, recordId });
    await refreshBookData(bookId);
    setReadingActivityRequest((request) => request + 1);
  }

  function handleSelectBook(bookId) {
    openBook(bookId);
  }

  function handleContinueReading(bookId) {
    openBook(bookId, true);
  }

  function handleOpenQuote() {
    if (!quote) return;
    if (quoteExposure) {
      openQuoteExposure(quoteExposure.id).catch(() => {});
      setActiveQuoteExposureId(quoteExposure.id);
    }
    openBook(quote.bookId, true);
  }

  const sessionActions = (
    <SessionActions
      user={user}
      isLoggingOut={isLoggingOut}
      logoutError={logoutError}
      onLogout={onLogout}
    />
  );

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
          userId={user.id}
          quoteExposureId={quote?.bookId === bookDetail.id ? activeQuoteExposureId : null}
          startInReadingContext={shouldStartReading}
          onBackToBookshelf={() => {
            setSelectedBookId(null);
            setShouldStartReading(false);
            setBookOpeningPhase(null);
            setOpeningPageCount(0);
          }}
          onSaveRecord={handleSaveRecord}
          onUpdateRecord={handleUpdateRecord}
          onDeleteRecord={handleDeleteRecord}
          onUpdateStatus={handleUpdateStatus}
          sessionActions={sessionActions}
        />
      ) : books.length || completedBooks.length || archivedBooks.length ? (
        <ReadingBookshelf
          books={books}
          completedBooks={completedBooks}
          archivedBooks={archivedBooks}
          openingBookId={openingBookId}
          bookOpeningPhase={bookOpeningPhase}
          openingPageCount={openingPageCount}
          onAddBook={() => setIsAddBookOpen(true)}
          onSelectBook={handleSelectBook}
          onContinueReading={handleContinueReading}
          onRestoreBook={handleRestoreBook}
          quote={quote}
          onOpenQuote={handleOpenQuote}
          readingActivity={readingActivity}
          isReadingActivityLoading={isReadingActivityLoading}
          readingActivityError={readingActivityError}
          onRetryReadingActivity={() => setReadingActivityRequest((request) => request + 1)}
          sessionActions={sessionActions}
        />
      ) : (
        <EmptyBookshelf
          sessionActions={sessionActions}
          onAddBook={() => setIsAddBookOpen(true)}
        />
      )}
      <AddBookDialog
        open={isAddBookOpen}
        onOpenChange={setIsAddBookOpen}
        onCreateBook={handleCreateBook}
      />
    </>
  );
}
