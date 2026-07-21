/* @vitest-environment jsdom */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AuthService, AuthSession } from '@/features/auth';
import type {
  CapturedInsight,
  InsightCaptureService,
  InsightMemoService,
  InsightRepository,
} from '@/entities/insight';
import { DesignSystemProvider } from '@/shared/ui';
import type { AndroidSharePluginAdapter } from '@/shared/capacitor';

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
    ).toHaveLength(1);
    expect(screen.getByRole('button', { name: '로그인' })).not.toBeNull();
    expect(
      screen.getByRole('link', { name: '문제·의견 남기기' })
    ).not.toBeNull();
    expect(screen.queryByRole('heading', { name: '홈' })).toBeNull();
  });

  it('presents the core feature tabs before login', () => {
    renderSignedOutApp();

    expect(
      screen.getByRole('heading', {
        name: '발견한 링크가 필요한 순간 다시 쓰이도록, 아맞다가 저장부터 꺼내보기까지 이어드려요.',
      })
    ).not.toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tabpanel', { name: '01 저장' })).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        name: '쓰다가 막히거나, 더 좋은 방법이 떠올랐나요?',
      })
    ).not.toBeNull();
    expect(
      screen.getAllByRole('button', { name: '서비스 경험하기' })
    ).toHaveLength(1);
    expect(
      screen.queryByRole('heading', {
        name: '저장해도 다시 찾기 어려웠던 이유',
      })
    ).toBeNull();
    expect(
      screen.queryByRole('heading', {
        name: '필요한 순간에 다시 꺼내는 방식',
      })
    ).toBeNull();
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

  it('로그인한 PWA 공유 진입은 저장 화면에 android_share 초안을 전달한다', async () => {
    window.history.replaceState(
      {},
      '',
      '/?tab=save#share-target?shared_url=https%3A%2F%2Fexample.com%2Farticle&shared_title=%EA%B3%B5%EC%9C%A0%20%EA%B8%B0%EC%82%AC'
    );
    const app = renderApp();

    app.emit({
      user: {
        email: 'member@example.com',
        id: 'user-1',
        user_metadata: { full_name: '테스트 사용자' },
      },
    });

    expect(
      ((await screen.findByLabelText('링크 URL')) as HTMLInputElement).value
    ).toBe('https://example.com/article');
    expect(
      screen.getByRole('heading', { name: '공유한 링크를 보관할까요?' })
    ).not.toBeNull();
    await waitFor(() => expect(window.location.hash).toBe(''));
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('?tab=save');
  });

  it('로그아웃 상태에서는 PWA 공유 초안을 렌더링하지 않고 주소만 정리한다', async () => {
    window.history.replaceState(
      {},
      '',
      '/?tab=save#share-target?shared_url=https%3A%2F%2Fexample.com%2Farticle'
    );
    renderSignedOutApp();

    expect(
      screen.getByRole('heading', {
        name: '저장한 링크를 필요한 순간 다시 꺼내보세요',
      })
    ).not.toBeNull();
    expect(screen.queryByLabelText('링크 URL')).toBeNull();
    await waitFor(() => expect(window.location.hash).toBe(''));
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('?tab=save');
  });

  it('Android 공유는 로그인 뒤 자동 저장하고 선택 메모와 완료를 처리한다', async () => {
    const user = userEvent.setup();
    const auth = createAuthServiceMock();
    const insight = createCapturedInsight();
    let receiveShare:
      Parameters<AndroidSharePluginAdapter['subscribe']>[0] | undefined;
    const plugin: AndroidSharePluginAdapter = {
      finishShare: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(async (listener) => {
        receiveShare = listener;
        return vi.fn().mockResolvedValue(undefined);
      }),
    };
    const captureService: InsightCaptureService = {
      capture: vi.fn().mockResolvedValue({
        created: true,
        insight,
        ok: true,
      }),
    };
    const memoService: InsightMemoService = {
      updateMemo: vi.fn().mockResolvedValue({ ok: true }),
    };

    render(
      <DesignSystemProvider>
        <App
          androidShareCaptureService={captureService}
          androidShareMemoService={memoService}
          androidSharePlugin={plugin}
          authService={auth.service}
        />
      </DesignSystemProvider>
    );
    auth.emit(null);

    act(() => {
      receiveShare?.({
        id: 'share-1',
        text: '읽을거리 https://example.com/article',
        title: '공유 기사',
      });
    });

    await waitFor(() =>
      expect(auth.service.signInWithGoogle).toHaveBeenCalledOnce()
    );
    expect(auth.service.signInWithGoogle).toHaveBeenCalledWith(
      window.location.origin,
      'android-share'
    );
    auth.emit({
      user: {
        email: 'member@example.com',
        id: 'user-1',
        user_metadata: { full_name: '테스트 사용자' },
      },
    });

    expect(
      await screen.findByRole('heading', { name: insight.title })
    ).not.toBeNull();
    expect(screen.getByText('저장됨')).not.toBeNull();
    expect(captureService.capture).toHaveBeenCalledWith({
      source: 'android_share',
      title: '공유 기사',
      url: 'https://example.com/article',
    });

    await user.click(screen.getByRole('button', { name: '메모 추가' }));
    await user.type(screen.getByLabelText('한 줄 메모 (선택)'), '다시 읽기');
    await user.click(screen.getByRole('button', { name: '완료' }));

    await waitFor(() => expect(plugin.finishShare).toHaveBeenCalledOnce());
    expect(memoService.updateMemo).toHaveBeenCalledWith(
      insight.id,
      '다시 읽기'
    );
  });
});

function createCapturedInsight(): CapturedInsight {
  return {
    category: null,
    createdAt: '2026-07-21T00:00:00.000Z',
    domain: 'example.com',
    id: '10000000-0000-4000-8000-000000000001',
    memo: null,
    normalizedUrl: 'https://example.com/article',
    originalUrl: 'https://example.com/article',
    title: '공유 기사',
    titleOrigin: 'capture',
    updatedAt: '2026-07-21T00:00:00.000Z',
  };
}

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
