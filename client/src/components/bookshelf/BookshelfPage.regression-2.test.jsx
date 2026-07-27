// Regression coverage for QA ISSUE-005: a saved quote must reach the bookshelf without a reload.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { BookshelfPage } from './BookshelfPage';
import {
  createReadingRecord,
  getBook,
  getBooks,
  getRandomQuote,
} from '@/lib/api';

vi.mock('@/lib/motion', () => ({ prefersReducedMotion: () => true }));
vi.mock('@/lib/api', () => ({
  createBook: vi.fn(),
  createQuoteExposure: vi.fn().mockResolvedValue({ id: 3 }),
  createReadingRecord: vi.fn(),
  deleteReadingRecord: vi.fn(),
  getBook: vi.fn(),
  getBooks: vi.fn(),
  getRandomQuote: vi.fn(),
  getReadingActivity: vi.fn().mockResolvedValue({ days: [] }),
  openQuoteExposure: vi.fn(),
  updateBookStatus: vi.fn(),
  updateReadingRecord: vi.fn(),
}));
vi.mock('./AddBookDialog', () => ({ AddBookDialog: () => null }));
vi.mock('./ReadingBookshelf', () => ({
  ReadingBookshelf: ({ books, quote, onSelectBook }) => (
    <>
      <button type="button" onClick={() => onSelectBook(books[0].id)}>책 열기</button>
      {quote && <p>{quote.text}</p>}
    </>
  ),
}));
vi.mock('./BookDetailScreen', () => ({
  BookDetailScreen: ({ book, onBackToBookshelf, onSaveRecord }) => (
    <button
      type="button"
      onClick={async () => {
        await onSaveRecord(book.id, { endPage: 20, quoteText: '새 글귀' });
        onBackToBookshelf();
      }}
    >
      기록 저장
    </button>
  ),
}));

test('refreshes the quote after saving a record with a quote', async () => {
  const shelf = { reading: [{ id: 1, status: 'READING' }], completed: [], archived: [] };
  getBooks.mockResolvedValue(shelf);
  getBook.mockResolvedValue(shelf.reading[0]);
  getRandomQuote
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ id: 2, bookId: 1, text: '새 글귀' });
  createReadingRecord.mockResolvedValue({});

  render(<BookshelfPage user={{ id: 1, nickname: '독자' }} />);

  fireEvent.click(await screen.findByRole('button', { name: '책 열기' }));
  fireEvent.click(await screen.findByRole('button', { name: '기록 저장' }));

  expect(await screen.findByText('새 글귀')).toBeInTheDocument();
  await waitFor(() => expect(getRandomQuote).toHaveBeenCalledTimes(2));
});
