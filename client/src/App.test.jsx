import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import App from './App';
import { getSession } from './lib/api';

vi.mock('./lib/api', () => ({
  getSession: vi.fn(),
}));
vi.mock('./components/bookshelf/BookshelfPage', () => ({
  BookshelfPage: ({ user }) => <p>{user.nickname}의 책장</p>,
}));
vi.mock('./components/onboarding/OnboardingPage', () => ({
  OnboardingPage: () => <p>온보딩</p>,
}));

test('opens the bookshelf for an authenticated user', async () => {
  getSession.mockResolvedValue({ id: 1, nickname: '독자' });

  render(<App />);

  expect(await screen.findByText('독자의 책장')).toBeInTheDocument();
});
