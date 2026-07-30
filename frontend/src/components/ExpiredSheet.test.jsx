import { vi, test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const appState = { fridge: {}, refreshFridge: vi.fn() };
const discardExpiredItems = vi.fn();
vi.mock('../context/AppContext', () => ({ useApp: () => appState }));
vi.mock('../api', () => ({ api: { discardExpiredItems: (...args) => discardExpiredItems(...args) } }));

const { default: ExpiredSheet } = await import('./ExpiredSheet.jsx');

const fridgeWith = (items) => ({
  egg: { id: 'egg', name: '계란', emoji: '🥚', items },
});

beforeEach(() => {
  cleanup(); // vitest globals가 꺼져 있어 testing-library 자동 정리가 안 걸린다 — 직접 비운다
  localStorage.clear();
  discardExpiredItems.mockReset().mockResolvedValue({ discarded: [] });
  appState.refreshFridge = vi.fn().mockResolvedValue(undefined);
  appState.fridge = {};
});

test('기한이 지난 내역이 있으면 버리라는 경고가 뜬다', () => {
  appState.fridge = fridgeWith([
    { dbId: 1, qtyAmount: 4, qtyUnit: '알', purchased: '7/1', expiry: 'D+3' },
  ]);
  render(<ExpiredSheet />);

  expect(screen.getByText('🗑 유통기한이 지났어요')).toBeInTheDocument();
  expect(screen.getByText('계란 4알')).toBeInTheDocument();
  expect(screen.getByText('D+3')).toBeInTheDocument();
});

test('아직 기한이 남은 내역만 있으면 뜨지 않는다 (D-0은 오늘까지 유효)', () => {
  appState.fridge = fridgeWith([
    { dbId: 1, qtyAmount: 4, qtyUnit: '알', purchased: '7/1', expiry: 'D-0' },
    { dbId: 2, qtyAmount: 2, qtyUnit: '알', purchased: '7/5', expiry: 'D-9' },
  ]);
  const { container } = render(<ExpiredSheet />);
  expect(container).toBeEmptyDOMElement();
});

test('같은 재료라도 기한이 지난 내역만 목록에 올라간다', () => {
  appState.fridge = fridgeWith([
    { dbId: 1, qtyAmount: 4, qtyUnit: '알', purchased: '7/1', expiry: 'D+3' },
    { dbId: 2, qtyAmount: 2, qtyUnit: '알', purchased: '7/28', expiry: 'D-9' },
  ]);
  render(<ExpiredSheet />);

  expect(screen.getByText('계란 4알')).toBeInTheDocument();
  expect(screen.queryByText('계란 2알')).not.toBeInTheDocument();
});

test('"버렸어요"를 누르면 만료 재료를 폐기한다', async () => {
  appState.fridge = fridgeWith([
    { dbId: 1, qtyAmount: 4, qtyUnit: '알', purchased: '7/1', expiry: 'D+3' },
  ]);
  render(<ExpiredSheet />);

  fireEvent.click(screen.getByRole('button', { name: '버렸어요' }));
  await waitFor(() => expect(discardExpiredItems).toHaveBeenCalledTimes(1));
  expect(appState.refreshFridge).toHaveBeenCalled();
});

test('"나중에"로 닫으면 같은 날 다시 열어도 뜨지 않는다', () => {
  appState.fridge = fridgeWith([
    { dbId: 1, qtyAmount: 4, qtyUnit: '알', purchased: '7/1', expiry: 'D+3' },
  ]);
  const { unmount } = render(<ExpiredSheet />);
  fireEvent.click(screen.getByRole('button', { name: '나중에' }));
  expect(screen.queryByText('🗑 유통기한이 지났어요')).not.toBeInTheDocument();
  unmount();

  const { container } = render(<ExpiredSheet />);
  expect(container).toBeEmptyDOMElement();
});

test('어제 닫아둔 상태라면 오늘 다시 뜬다', () => {
  localStorage.setItem('expiredAlertDismissedOn', '2020-01-01');
  appState.fridge = fridgeWith([
    { dbId: 1, qtyAmount: 4, qtyUnit: '알', purchased: '7/1', expiry: 'D+3' },
  ]);
  render(<ExpiredSheet />);
  expect(screen.getByText('🗑 유통기한이 지났어요')).toBeInTheDocument();
});
