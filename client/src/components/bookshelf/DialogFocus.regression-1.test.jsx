import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { AddBookDialog } from './AddBookDialog';
import { SessionRecordDialog } from './SessionRecordDialog';

vi.mock('../../lib/api', () => ({
  searchBooks: vi.fn(),
}));

// Regression: ISSUE-002 — controlled dialogs lost focus after Escape
// Found by /qa on 2026-07-27
// Report: .gstack/qa-reports/qa-report-localhost-2026-07-27-dialogs.md
test.each([
  ['책 추가', AddBookHarness, '책 이름'],
  ['독서 기록', RecordDialogHarness, '오늘 끝낸 페이지'],
])('%s 대화상자를 닫으면 포커스가 트리거로 돌아간다', async (_, Harness, inputName) => {
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: `${_} 열기` });

  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.getByLabelText(inputName)).toHaveFocus();

  fireEvent.keyDown(document.activeElement, { key: 'Escape' });

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();
});

function AddBookHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>책 추가 열기</button>
      <AddBookDialog open={open} onOpenChange={setOpen} onCreateBook={vi.fn()} />
    </>
  );
}

function RecordDialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>독서 기록 열기</button>
      <SessionRecordDialog
        book={{ id: 1, title: '테스트 책', initialPage: 1, pageCount: 300, readingRecords: [] }}
        open={open}
        onOpenChange={setOpen}
        onSave={vi.fn()}
      />
    </>
  );
}
