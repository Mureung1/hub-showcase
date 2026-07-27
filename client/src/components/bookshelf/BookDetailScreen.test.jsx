import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { BookDetailScreen } from './BookDetailScreen';

test('shows the next reading action for a new book', () => {
  render(
    <BookDetailScreen
      book={{ id: 1, title: '테스트 책', status: 'READING', initialPage: 12, readingRecords: [] }}
      userId={1}
      quoteExposureId={null}
      startInReadingContext={false}
      onBackToBookshelf={vi.fn()}
      onSaveRecord={vi.fn()}
      onUpdateRecord={vi.fn()}
      onDeleteRecord={vi.fn()}
      onUpdateStatus={vi.fn()}
    />,
  );

  expect(screen.getByRole('heading', { level: 1, name: '테스트 책' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /12쪽부터 이어 읽기/ })).toBeInTheDocument();
});
