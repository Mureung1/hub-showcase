/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  CapturedInsight,
  InsightCaptureService,
  InsightMemoService,
} from '@/entities/insight';
import type { AndroidSharePluginAdapter } from '@/shared/capacitor';

import { useAndroidShare } from './use_android_share';

describe('useAndroidShare', () => {
  it('캡처 호출이 거부되면 재시도 가능한 저장 오류로 전이한다', async () => {
    const captureService: InsightCaptureService = {
      capture: vi.fn().mockRejectedValue(new Error('network error')),
    };
    const view = renderAndroidShare({ captureService });

    await waitFor(() => expect(view.receiveShare).toBeTypeOf('function'));
    act(() => {
      view.receiveShare?.({
        id: 'share-1',
        text: 'https://example.com/article',
      });
    });

    await waitFor(() => expect(view.result.current.state.status).toBe('error'));
    expect(view.result.current.state).toMatchObject({ retry: 'save' });
  });

  it('메모 저장이 거부되면 입력을 유지하고 완료 처리 상태를 풀어준다', async () => {
    const memoService: InsightMemoService = {
      updateMemo: vi.fn().mockRejectedValue(new Error('network error')),
    };
    const view = renderAndroidShare({ memoService });

    await waitFor(() => expect(view.receiveShare).toBeTypeOf('function'));
    act(() => {
      view.receiveShare?.({
        id: 'share-1',
        text: 'https://example.com/article',
      });
    });
    await waitFor(() => expect(view.result.current.state.status).toBe('saved'));
    act(() => {
      view.result.current.startMemoEditing();
      view.result.current.changeMemo('다시 읽기');
    });

    await act(async () => {
      await view.result.current.complete();
    });

    expect(view.result.current.isCompleting).toBe(false);
    expect(view.result.current.memoError).toBe(
      '메모를 저장하지 못했어요. 입력은 유지했어요.'
    );
    expect(view.result.current.state).toMatchObject({
      memo: '다시 읽기',
      status: 'editing-memo',
    });
    expect(view.finishShare).not.toHaveBeenCalled();
  });
});

function renderAndroidShare({
  captureService = {
    capture: vi.fn().mockResolvedValue({
      created: true,
      insight: createCapturedInsight(),
      ok: true,
    }),
  },
  memoService = {
    updateMemo: vi.fn().mockResolvedValue({ ok: true }),
  },
}: {
  captureService?: InsightCaptureService;
  memoService?: InsightMemoService;
}) {
  let receiveShare:
    Parameters<AndroidSharePluginAdapter['subscribe']>[0] | undefined;
  const finishShare = vi.fn().mockResolvedValue(undefined);
  const plugin: AndroidSharePluginAdapter = {
    finishShare,
    subscribe: vi.fn(async (listener) => {
      receiveShare = listener;
      return vi.fn().mockResolvedValue(undefined);
    }),
  };
  const view = renderHook(() =>
    useAndroidShare({
      androidShareOAuthCallbackRevision: 0,
      authStatus: 'signed-in',
      captureService,
      hasSignInError: false,
      memoService,
      plugin,
      signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    })
  );

  return {
    ...view,
    finishShare,
    get receiveShare() {
      return receiveShare;
    },
  };
}

function createCapturedInsight(): CapturedInsight {
  return {
    categoryId: null,
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
