import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AddBookDialog } from './AddBookDialog';
import { searchBooks } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  searchBooks: vi.fn(),
}));

describe('AddBookDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('검색 결과에서 선택한 판본과 시작 페이지를 등록한다', async () => {
    searchBooks.mockResolvedValue({
      books: [{
        providerId: 'volume-1',
        title: '아주 작은 습관의 힘',
        author: '제임스 클리어',
        isbn13: '9780735211292',
        publishedDate: '2018',
        pageCount: 320,
      }],
    });
    const onCreateBook = vi.fn().mockResolvedValue({ id: 1 });

    render(<AddBookDialog open onOpenChange={vi.fn()} onCreateBook={onCreateBook} />);

    fireEvent.change(screen.getByLabelText('책 이름'), { target: { value: '아주 작은 습관의 힘' } });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    fireEvent.click(await screen.findByRole('option', { name: /아주 작은 습관의 힘/ }));
    fireEvent.change(screen.getByLabelText('시작 페이지'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: '책장에 꽂기' }));

    await waitFor(() => expect(onCreateBook).toHaveBeenCalledWith({ providerId: 'volume-1', initialPage: 12 }));
  });
});
