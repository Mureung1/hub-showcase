import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { BookDetailScreen } from './BookDetailScreen';

// Regression: ISSUE-003 — pending delete/status requests could be dismissed
// Found by /qa on 2026-07-27
// Report: .gstack/qa-reports/qa-report-localhost-2026-07-27-detail-dialogs.md
test.each([
  ['삭제', '기록 삭제', '기록을 지우는 중이에요…', 'onDeleteRecord'],
  ['완독으로 옮기기', '완독으로 옮기기', '저장 중이에요…', 'onUpdateStatus'],
])('%s 요청 중에는 대화상자를 닫지 않는다', async (triggerName, confirmName, pendingName, callbackName) => {
  let resolveRequest;
  const request = new Promise((resolve) => {
    resolveRequest = resolve;
  });

  renderDetail({
    [callbackName]: vi.fn(() => request),
  });

  fireEvent.click(screen.getByRole('button', { name: triggerName }));
  fireEvent.click(screen.getByRole('button', { name: confirmName }));
  expect(screen.getByRole('button', { name: pendingName })).toBeDisabled();

  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  resolveRequest();
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

function renderDetail(overrides) {
  render(
    <BookDetailScreen
      book={{
        id: 1,
        title: '테스트 책',
        status: 'READING',
        initialPage: 1,
        readingRecords: [{
          id: 1,
          createdAt: '2026-07-27T10:00:00.000Z',
          startPage: 1,
          endPage: 20,
          impression: '',
        }],
      }}
      userId={1}
      quoteExposureId={null}
      startInReadingContext={false}
      onBackToBookshelf={vi.fn()}
      onSaveRecord={vi.fn()}
      onUpdateRecord={vi.fn()}
      onDeleteRecord={vi.fn()}
      onUpdateStatus={vi.fn()}
      {...overrides}
    />,
  );
}
