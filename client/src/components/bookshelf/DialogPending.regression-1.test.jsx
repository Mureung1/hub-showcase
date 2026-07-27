import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { AddBookDialog } from './AddBookDialog';
import { SessionRecordDialog } from './SessionRecordDialog';
import { searchBooks } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  searchBooks: vi.fn(),
}));

// Regression: ISSUE-004 — pending input dialogs could be dismissed
// Found by /qa on 2026-07-27
// Report: .gstack/qa-reports/qa-report-localhost-2026-07-27-input-dialogs.md
test('책 저장 중에는 대화상자를 닫지 않는다', async () => {
  const request = deferred();
  searchBooks.mockResolvedValue({
    books: [{ providerId: 'qa-book', title: 'QA 책', author: '잇장' }],
  });

  render(<AddBookHarness onCreateBook={() => request.promise} />);
  fireEvent.click(screen.getByRole('button', { name: '책 추가 열기' }));
  fireEvent.change(screen.getByLabelText('책 이름'), { target: { value: 'QA 책' } });
  fireEvent.click(screen.getByRole('button', { name: '검색' }));
  fireEvent.click(await screen.findByRole('option', { name: /QA 책/ }));
  fireEvent.click(screen.getByRole('button', { name: '책장에 꽂기' }));

  expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  request.resolve();
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('독서 기록 저장 중에는 대화상자를 닫지 않는다', async () => {
  const request = deferred();

  render(<RecordDialogHarness onSave={() => request.promise} />);
  fireEvent.click(screen.getByRole('button', { name: '독서 기록 열기' }));
  fireEvent.change(screen.getByLabelText('오늘 끝낸 페이지'), { target: { value: '20' } });
  fireEvent.click(screen.getByRole('button', { name: '기록 페이지 추가' }));

  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  request.resolve();
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

function AddBookHarness({ onCreateBook }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>책 추가 열기</button>
      <AddBookDialog open={open} onOpenChange={setOpen} onCreateBook={onCreateBook} />
    </>
  );
}

function RecordDialogHarness({ onSave }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>독서 기록 열기</button>
      <SessionRecordDialog
        book={{ id: 1, title: 'QA 책', initialPage: 1, pageCount: 300, readingRecords: [] }}
        open={open}
        onOpenChange={setOpen}
        onSave={onSave}
      />
    </>
  );
}

function deferred() {
  let resolve;
  const promise = new Promise((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
