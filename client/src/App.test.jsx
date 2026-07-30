import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import App from './App';
import { getSession, logout } from './lib/api';

vi.mock('./lib/api', () => ({
  getSession: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('./components/bookshelf/BookshelfPage', () => ({
  BookshelfPage: ({ user, isLoggingOut, onLogout }) => (
    <>
      <p>{user.nickname}의 책장</p>
      <button type="button" disabled={isLoggingOut} onClick={onLogout}>로그아웃</button>
    </>
  ),
}));
vi.mock('./components/onboarding/OnboardingPage', () => ({
  OnboardingPage: () => <p>온보딩</p>,
}));

test('opens the bookshelf for an authenticated user', async () => {
  getSession.mockResolvedValue({ id: 1, nickname: '독자' });

  render(<App />);

  expect(await screen.findByText('독자의 책장')).toBeInTheDocument();
});

test('logs out and returns to onboarding', async () => {
  getSession.mockResolvedValue({ id: 1, nickname: '독자' });
  logout.mockResolvedValue();
  window.history.replaceState({}, '', '/bookshelf');

  render(<App />);

  fireEvent.click(await screen.findByRole('button', { name: '로그아웃' }));

  expect(await screen.findByText('온보딩')).toBeInTheDocument();
  expect(window.location.pathname).toBe('/');
});
