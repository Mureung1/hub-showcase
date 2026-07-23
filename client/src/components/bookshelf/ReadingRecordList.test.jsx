import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReadingRecordList } from './ReadingRecordList';

const firstRecord = {
  id: 1,
  createdAt: '2025-01-15T12:00:00.000Z',
  startPage: 10,
  endPage: 25,
  impression: '첫 감상',
  readingDurationSeconds: 930,
};
const latestRecord = {
  id: 2,
  createdAt: '2025-01-16T12:00:00.000Z',
  startPage: 26,
  endPage: 26,
  impression: '',
};

function renderList({ records = [firstRecord, latestRecord], latest = latestRecord } = {}) {
  const onEditRecord = vi.fn();
  const onDeleteRecord = vi.fn();

  render(
    <ReadingRecordList
      records={records}
      latestRecord={latest}
      onEditRecord={onEditRecord}
      onDeleteRecord={onDeleteRecord}
    />,
  );

  return { onEditRecord, onDeleteRecord };
}

describe('ReadingRecordList', () => {
  it('빈 기록에서는 안내 문구만 표시한다', () => {
    renderList({ records: [] });

    expect(screen.getByText('첫 독서 기록을 이곳에 남겨 보세요.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
  });

  it('기록의 날짜, 읽은 범위와 감상을 표시한다', () => {
    renderList({ records: [firstRecord] });

    expect(screen.getByText('2025년 1월 15일')).toBeInTheDocument();
    expect(screen.getByText('10–25쪽 · 16쪽 읽음')).toBeInTheDocument();
    expect(screen.getByText('15분 30초 함께 읽음')).toBeInTheDocument();
    expect(screen.getByText('첫 감상')).toBeInTheDocument();
  });

  it('빈 감상은 표시하지 않고 한 쪽 읽은 기록을 계산한다', () => {
    renderList({ records: [latestRecord] });

    expect(screen.getByText('26–26쪽 · 1쪽 읽음')).toBeInTheDocument();
    expect(screen.queryByText('첫 감상')).not.toBeInTheDocument();
  });

  it('수정 버튼은 선택한 기록을 콜백으로 전달한다', () => {
    const { onEditRecord } = renderList();

    fireEvent.click(screen.getAllByRole('button', { name: '수정' })[0]);

    expect(onEditRecord).toHaveBeenCalledOnce();
    expect(onEditRecord).toHaveBeenCalledWith(firstRecord);
  });

  it('최신 기록에만 삭제 버튼을 표시하고 해당 기록을 콜백으로 전달한다', () => {
    const { onDeleteRecord } = renderList();

    const deleteButton = screen.getByRole('button', { name: '삭제' });
    expect(screen.getAllByRole('button', { name: '삭제' })).toHaveLength(1);
    fireEvent.click(deleteButton);

    expect(onDeleteRecord).toHaveBeenCalledOnce();
    expect(onDeleteRecord).toHaveBeenCalledWith(latestRecord);
  });

  it('최신 기록이 없으면 삭제 버튼을 표시하지 않는다', () => {
    renderList({ latest: null });

    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
  });
});
