/* @vitest-environment jsdom */
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AuthService, AuthSession } from '@/features/auth';
import type { InsightRepository } from '@/entities/insight';
import { DesignSystemProvider } from '@/shared/ui';

import { App } from './index';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

function createAuthServiceMock() {
  let listener: ((session: AuthSession | null) => void) | undefined;
  const service: AuthService = {
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn((nextListener) => {
      listener = nextListener;
      return vi.fn();
    }),
  };

  return {
    emit(session: AuthSession | null) {
      act(() => listener?.(session));
    },
    service,
  };
}

function renderApp(
  createInsightRepository: (userId: string) => InsightRepository = () =>
    createRepository()
) {
  const auth = createAuthServiceMock();
  const view = render(
    <DesignSystemProvider>
      <App
        authService={auth.service}
        createInsightRepository={createInsightRepository}
      />
    </DesignSystemProvider>
  );

  return { ...auth, ...view };
}

function renderSignedOutApp() {
  const app = renderApp();
  app.emit(null);
  return app;
}

describe('App public API', () => {
  it('exports the root app component from the app layer', () => {
    expect(App).toBeTypeOf('function');
  });
});

describe('App onboarding flow', () => {
  it('does not expose the workspace before the initial session is restored', () => {
    renderApp();

    expect(
      screen.getByRole('status', { name: '로그인 상태 확인 중' })
    ).not.toBeNull();
    expect(screen.queryByRole('heading', { name: '홈' })).toBeNull();
  });

  it('shows service onboarding before the workspace', () => {
    renderSignedOutApp();

    expect(
      screen.getByRole('heading', {
        name: '저장한 링크를 필요한 순간 다시 꺼내보세요',
      })
    ).not.toBeNull();
    expect(
      screen.getAllByRole('button', { name: '서비스 경험하기' })
    ).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: '홈' })).toBeNull();
  });

  it('presents a vertical onboarding story before login', () => {
    renderSignedOutApp();

    expect(
      screen.getByRole('heading', {
        name: '저장해도 다시 찾기 어려웠던 이유',
      })
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        name: '저장은 빠르게, 정리는 나중에',
      })
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        name: '상황으로 다시 연결되는 꺼내보기',
      })
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        name: '아맞다로 시작해보세요',
      })
    ).not.toBeNull();
    expect(
      screen.getAllByRole('button', { name: '서비스 경험하기' })
    ).toHaveLength(2);
  });

  it('enters the workspace only after a signed-in session arrives', async () => {
    const user = userEvent.setup();
    const createInsightRepository = vi.fn(() => createRepository());
    const app = renderApp(createInsightRepository);
    app.emit(null);

    await user.click(
      screen.getAllByRole('button', { name: '서비스 경험하기' })[0]
    );

    expect(screen.getByRole('heading', { name: '환영합니다!' })).not.toBeNull();
    expect(
      screen.getByRole('button', { name: 'Google로 시작하기' })
    ).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Google로 시작하기' }));

    expect(app.service.signInWithGoogle).toHaveBeenCalledWith(
      window.location.origin
    );
    expect(screen.queryByRole('heading', { name: '홈' })).toBeNull();

    app.emit({
      user: {
        email: 'member@example.com',
        id: 'user-1',
        user_metadata: { full_name: '테스트 사용자' },
      },
    });

    expect(screen.getByRole('heading', { name: '홈' })).not.toBeNull();
    expect(createInsightRepository).toHaveBeenCalledWith('user-1');
    expect(
      screen.getByRole('heading', {
        name: '지금 필요한 인사이트를 다시 꺼내보세요',
      })
    ).not.toBeNull();
  });

  it('shows a retryable message when Google login cannot start', async () => {
    const user = userEvent.setup();
    const app = renderSignedOutApp();
    vi.mocked(app.service.signInWithGoogle)
      .mockRejectedValueOnce(new Error('Google 공급자 연결 실패'))
      .mockResolvedValueOnce(undefined);

    await user.click(
      screen.getAllByRole('button', { name: '서비스 경험하기' })[0]
    );
    await user.click(screen.getByRole('button', { name: 'Google로 시작하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      'Google 공급자 연결 실패'
    );

    await user.click(screen.getByRole('button', { name: 'Google로 시작하기' }));

    expect(app.service.signInWithGoogle).toHaveBeenCalledTimes(2);
  });

  it('returns an OAuth cancellation directly to the retryable login screen', () => {
    window.history.replaceState(
      {},
      '',
      '/?error=access_denied&error_description=The+user+cancelled'
    );
    const app = renderApp();

    app.emit(null);

    expect(screen.getByRole('heading', { name: '환영합니다!' })).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toContain(
      'Google 로그인이 취소되었습니다.'
    );
    expect(
      screen.getByRole('button', { name: 'Google로 시작하기' })
    ).not.toBeNull();
  });

  it('removes workspace access after the signed-out event', async () => {
    const user = userEvent.setup();
    const app = renderApp();
    app.emit({
      user: {
        email: 'member@example.com',
        id: 'user-1',
        user_metadata: { full_name: '테스트 사용자' },
      },
    });

    await user.click(screen.getByRole('button', { name: '계정 메뉴 열기' }));
    await user.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(app.service.signOut).toHaveBeenCalledOnce();

    app.emit(null);

    expect(screen.queryByRole('heading', { name: '홈' })).toBeNull();
    expect(
      screen.getByRole('heading', {
        name: '저장한 링크를 필요한 순간 다시 꺼내보세요',
      })
    ).not.toBeNull();
  });
});

function createRepository(): InsightRepository {
  return {
    async create(insight) {
      return { insight, ok: true };
    },
    async delete() {
      return { ok: true };
    },
    async list() {
      return { insights: [], warnings: [] };
    },
    async update(insight) {
      return { insight, ok: true };
    },
  };
}
