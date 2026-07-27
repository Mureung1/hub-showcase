import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  getReadingActivityRange,
  ReadingActivityCalendar,
} from './ReadingActivityCalendar';

describe('ReadingActivityCalendar', () => {
  it('builds the twelve-week range around the current Seoul week', () => {
    expect(getReadingActivityRange(new Date('2026-07-27T03:00:00Z'))).toEqual({
      from: '2026-05-11',
      to: '2026-08-02',
      today: '2026-07-27',
    });
  });

  it('shows the recorded day count without scoring empty days', () => {
    render(
      <ReadingActivityCalendar
        activity={{
          from: '2026-01-05',
          to: '2026-03-29',
          days: [{ date: '2026-02-01', count: 2 }],
        }}
        isLoading={false}
        error=""
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('1일 기록')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: /2월 1일.*독서 기록 2개/ })).toBeInTheDocument();
    expect(screen.queryByText(/점수|스트릭|결석/)).not.toBeInTheDocument();
  });
});
