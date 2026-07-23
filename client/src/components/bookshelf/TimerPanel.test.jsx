import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TimerPanel } from './TimerPanel';

describe('TimerPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-23T00:00:00Z'));
    window.sessionStorage.clear();
  });

  afterEach(() => vi.useRealTimers());

  it('continues measuring past the selected time until the reader ends the session', () => {
    const onEndSession = vi.fn();
    render(<TimerPanel userId={1} bookId={2} onEndSession={onEndSession} />);

    fireEvent.click(screen.getByRole('button', { name: '15분' }));
    fireEvent.click(screen.getByRole('button', { name: '독서 시작하기' }));
    expect(screen.getByText('15:00 남았어요.')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(15 * 60 * 1000 + 30 * 1000));
    expect(screen.getByText('15:30 읽는 중이에요.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '세션 종료하고 기록 남기기' }));
    expect(onEndSession).toHaveBeenCalledWith(930);
    expect(window.sessionStorage.getItem('itjang:reading-session:1:2')).toBeNull();
  });

  it('restores an active session after a refresh', () => {
    window.sessionStorage.setItem('itjang:reading-session:1:2', JSON.stringify({
      startedAt: Date.now() - 5 * 60 * 1000,
      durationMinutes: 25,
    }));

    render(<TimerPanel userId={1} bookId={2} onEndSession={vi.fn()} />);

    expect(screen.getByText('20:00 남았어요.')).toBeInTheDocument();
  });

  it('pauses elapsed time and resumes from the same point', () => {
    const onEndSession = vi.fn();
    render(<TimerPanel userId={1} bookId={2} onEndSession={onEndSession} />);

    fireEvent.click(screen.getByRole('button', { name: '25분' }));
    fireEvent.click(screen.getByRole('button', { name: '독서 시작하기' }));
    act(() => vi.advanceTimersByTime(5 * 60 * 1000));
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }));

    act(() => vi.advanceTimersByTime(10 * 60 * 1000));
    expect(screen.getByText('5:00 읽었어요.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '계속 읽기' }));
    act(() => vi.advanceTimersByTime(3 * 60 * 1000));
    fireEvent.click(screen.getByRole('button', { name: '세션 종료하고 기록 남기기' }));
    expect(onEndSession).toHaveBeenCalledWith(8 * 60);
  });
});
