// §8.4 "키보드 우선 입력" 회귀 방지 테스트.
// 고치기 전엔 text 셀만 자동 포커스됐고 number/date는 안 됐다 — 그래서 숫자를 칠 때마다
// 마우스로 입력란을 먼저 클릭해야 했다. 아래 테스트가 그 회귀를 막는다:
//   1) 타이핑 셀(number/date)은 뜨면 입력란에 자동 포커스된다
//   2) number/date에서 Enter가 값을 확정한다
//   3) 선택형(yesno)은 자동 포커스하지 않는다 (첫 보기가 Enter로 잘못 선택되는 걸 막기 위해)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createInitialState } from '../types';
import type { Cell } from '../engine';
import { ActiveCell } from './ActiveCell';

function makeCell(over: Partial<Cell> & Pick<Cell, 'id' | 'kind' | 'title'>): Cell {
  return { label: over.title, get: () => '', set: () => {}, ...over };
}

const base = { editing: false, primary: true, data: createInitialState(), onCommit: () => {} };

describe('ActiveCell 자동 포커스 (§8.4)', () => {
  it('숫자 셀은 뜨면 입력란에 자동 포커스된다', async () => {
    const cell = makeCell({ id: 'n1', kind: 'number', title: '현금 잔액이 얼마인가요?', money: true });
    render(<ActiveCell {...base} cell={cell} />);
    const input = screen.getByLabelText(/금액 입력/);
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('날짜 셀은 뜨면 첫 입력 요소(년)에 자동 포커스된다', async () => {
    const cell = makeCell({ id: 'd1', kind: 'date-ymd', title: '사업연도 개시일' });
    render(<ActiveCell {...base} cell={cell} />);
    await waitFor(() => expect(screen.getByLabelText('년')).toHaveFocus());
  });

  it('선택형(yesno) 셀은 첫 보기 버튼에 자동 포커스하지 않는다', async () => {
    // 앞 질문을 Enter로 넘긴 손이 그대로 Enter를 눌러 첫 보기가 잘못 선택되는 걸 막는다
    const cell = makeCell({ id: 'y1', kind: 'yesno', title: '중소기업인가요?' });
    render(<ActiveCell {...base} cell={cell} />);
    await new Promise((r) => setTimeout(r, 400)); // 자동 포커스 지연(340ms) 창을 지나서 확인
    expect(screen.getByText('네, 있어요')).not.toHaveFocus();
    expect(screen.getByText('아니요')).not.toHaveFocus();
  });
});

describe('ActiveCell Enter 확정 (§8.4)', () => {
  it('숫자 셀에서 Enter를 누르면 입력값으로 확정된다', () => {
    const onCommit = vi.fn();
    const cell = makeCell({ id: 'n2', kind: 'number', title: '현금', money: true });
    render(<ActiveCell {...base} cell={cell} onCommit={onCommit} />);
    const input = screen.getByLabelText(/금액 입력/);
    fireEvent.change(input, { target: { value: '5000' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('5000');
  });

  it('빈 숫자 셀에서 Enter는 아무 일도 하지 않는다', () => {
    const onCommit = vi.fn();
    const cell = makeCell({ id: 'n3', kind: 'number', title: '현금', money: true });
    render(<ActiveCell {...base} cell={cell} onCommit={onCommit} />);
    fireEvent.keyDown(screen.getByLabelText(/금액 입력/), { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('날짜 셀은 다 채우고 Enter를 누르면 YYYY-MM-DD로 확정된다', () => {
    const onCommit = vi.fn();
    const cell = makeCell({ id: 'd2', kind: 'date-ymd', title: '개시일' });
    render(<ActiveCell {...base} cell={cell} onCommit={onCommit} />);
    fireEvent.change(screen.getByLabelText('년'), { target: { value: '2025' } });
    fireEvent.change(screen.getByLabelText('월'), { target: { value: '3' } });
    const day = screen.getByPlaceholderText('일');
    fireEvent.change(day, { target: { value: '15' } });
    fireEvent.keyDown(day, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('2025-03-15');
  });

  it('날짜가 덜 채워졌으면 Enter가 확정하지 않는다', () => {
    const onCommit = vi.fn();
    const cell = makeCell({ id: 'd3', kind: 'date-ymd', title: '개시일' });
    render(<ActiveCell {...base} cell={cell} onCommit={onCommit} />);
    fireEvent.change(screen.getByLabelText('년'), { target: { value: '2025' } });
    fireEvent.keyDown(screen.getByLabelText('년'), { key: 'Enter' }); // 월·일 비어 있음
    expect(onCommit).not.toHaveBeenCalled();
  });
});
