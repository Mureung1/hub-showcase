import { vi, test, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const appState = {
  back: vi.fn(),
  receipt: {
    id: 'r_1',
    date: '2026.07.30',
    items: [
      { matched: true, matchedIngredientId: 'garlic', category: 'fresh', quantityLabel: '20알' },
    ],
  },
  expiryOverrides: {},
  setExpiryOverride: vi.fn((id, iso) => { appState.expiryOverrides[id] = iso; }),
  confirmReceipt: vi.fn(),
};

vi.mock('../context/AppContext', () => ({ useApp: () => appState }));
vi.mock('../api', () => ({
  api: {
    getIngredients: () => Promise.resolve({
      ingredients: [{ id: 'garlic', name: '마늘', emoji: '🧄', category: 'fresh', avgShelfLifeDays: { summer: 10 } }],
    }),
  },
}));

const { default: ExpiryCheck } = await import('./ExpiryCheck.jsx');

// 회귀 테스트: calcExpiryDate에 재료 객체를 넘기던 버그 때문에 항상 null이 나와, 재료별
// 보관기간과 무관하게 폴백(+7일)이 쓰였다. 마늘 여름 보관기간은 10일이므로 7/30 + 10일이어야 한다.
test('신선식품 기본 유통기한이 재료별 여름 보관기간으로 채워진다', async () => {
  render(<ExpiryCheck />);

  const input = await screen.findByDisplayValue('2026-08-09');
  expect(input).toBeInTheDocument();
  await waitFor(() => expect(appState.expiryOverrides.garlic).toBe('2026-08-09'));
});
