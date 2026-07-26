/* @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Category } from '@/entities/category';
import { DesignSystemProvider } from '@/shared/ui/design-system-provider';

import type { InsightImportService } from '../model/insight_import_service';
import type { ImportHistoryEntry, PreparedImport } from '../model/import_types';
import { InsightImportDialog } from './insight_import_dialog';

const JOB_ID = '10000000-0000-4000-8000-000000000001';
const CATEGORY: Category = {
  colorKey: 'green-2',
  createdAt: '2026-07-24T00:00:00.000Z',
  id: '20000000-0000-4000-8000-000000000001',
  name: '저장됨',
  sortOrder: 0,
  updatedAt: '2026-07-24T00:00:00.000Z',
};

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: vi.fn(() => []),
  });
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      disconnect() {}
      observe() {}
      unobserve() {}
    }
  );
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

afterEach(cleanup);

describe('InsightImportDialog', () => {
  it('링크 분석부터 매핑·반영·2단계 Undo까지 실제 흐름을 제공한다', async () => {
    const user = userEvent.setup();
    const service = createService();
    const onCategoriesChanged = vi.fn();
    const onLibraryChanged = vi.fn();
    service.prepare.mockResolvedValue({
      ok: true,
      value: createPreparedImport(),
    });
    service.commit.mockResolvedValue({
      ok: true,
      value: {
        createdCount: 1,
        duplicateCount: 2,
        excludedCount: 1,
        jobId: JOB_ID,
      },
    });
    service.undo.mockResolvedValue({
      ok: true,
      value: {
        alreadyDeletedCount: 0,
        deletedCount: 1,
        jobId: JOB_ID,
        preservedCount: 0,
      },
    });

    renderDialog({
      categories: [CATEGORY],
      onCategoriesChanged,
      onLibraryChanged,
      service,
    });

    const sourceButton = screen.getByRole('button', {
      name: '링크 붙여넣기',
    });
    await user.click(sourceButton);
    const textarea = screen.getByRole('textbox', { name: '가져올 링크' });
    const analyzeButton = screen.getByRole('button', { name: '분석하기' });

    await user.type(textarea, 'https://example.com/a\nhttps://example.com/b');
    sourceButton.focus();
    await user.tab();
    expect(document.activeElement).toBe(textarea);
    await user.tab();
    expect(document.activeElement).toBe(analyzeButton);

    await user.click(analyzeButton);

    expect(onLibraryChanged).not.toHaveBeenCalled();
    expect(onCategoriesChanged).not.toHaveBeenCalled();
    expect(screen.getByText('신규')).toBeTruthy();
    expect(screen.getByText('기존 중복')).toBeTruthy();
    expect(screen.getByText('입력 중복')).toBeTruthy();
    expect(screen.getByText('제외')).toBeTruthy();
    expect(
      screen.getByText('제외된 항목 확인', { selector: 'summary' })
    ).toBeTruthy();

    await user.click(screen.getByRole('combobox', { name: '개발 분류' }));
    await user.click(screen.getByRole('option', { name: '기존 분류: 저장됨' }));
    await user.click(screen.getByRole('combobox', { name: '개발 분류' }));
    await user.click(screen.getByRole('option', { name: '새 분류' }));
    await user.type(
      screen.getByRole('textbox', { name: '개발 새 분류 이름' }),
      '연구'
    );

    await user.click(screen.getByRole('button', { name: '가져오기' }));

    expect(service.commit).toHaveBeenCalledTimes(1);
    expect(service.commit).toHaveBeenCalledWith(JOB_ID, [
      {
        collectionKey: '["개발"]',
        target: { colorKey: 'slate-2', kind: 'new', name: '연구' },
      },
    ]);
    expect(onLibraryChanged).toHaveBeenCalledTimes(1);
    expect(onCategoriesChanged).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('분석 후 다른 경로에서 저장된 1개를 중복으로 제외했어요')
    ).toBeTruthy();
    expect(
      screen
        .getByRole('status', { name: '가져오기를 완료했어요' })
        .getAttribute('aria-live')
    ).toBe('polite');

    await user.click(screen.getByRole('button', { name: '가져오기 되돌리기' }));
    expect(
      screen.getByText('이 작업에서 새로 만든 인사이트만 삭제합니다.')
    ).toBeTruthy();
    expect(service.undo).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '정말 되돌리기' }));

    expect(service.undo).toHaveBeenCalledWith(JOB_ID);
    expect(screen.getByText('인사이트 1개를 되돌렸어요.')).toBeTruthy();
  }, 15_000);

  it('분석 중 액션을 비활성화하고 안전한 오류를 alert로 알린다', async () => {
    const user = userEvent.setup();
    const service = createService();
    const deferred =
      createDeferred<Awaited<ReturnType<InsightImportService['prepare']>>>();
    service.prepare.mockReturnValue(deferred.promise);
    renderDialog({ service });

    await user.click(screen.getByRole('button', { name: '링크 붙여넣기' }));
    await user.type(
      screen.getByRole('textbox', { name: '가져올 링크' }),
      'https://example.com'
    );
    await user.click(screen.getByRole('button', { name: '분석하기' }));

    expect(
      (
        screen.getByRole('button', {
          name: '분석 중',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);

    deferred.resolve({ ok: false, reason: 'write-failed' });

    const alert = await screen.findByRole('alert', {
      name: '가져오기를 진행하지 못했어요',
    });
    expect(alert.textContent).not.toContain('https://example.com');
    expect(
      (
        screen.getByRole('textbox', {
          name: '가져올 링크',
        }) as HTMLTextAreaElement
      ).value
    ).toBe('https://example.com');
  });

  it('최근 기록의 예외를 펼칠 때만 조회하고 경고 뒤 기록을 삭제한다', async () => {
    const user = userEvent.setup();
    const service = createService();
    service.listHistory.mockResolvedValue({
      ok: true,
      value: [createHistoryEntry()],
    });
    service.listIssues.mockResolvedValue({
      ok: true,
      value: {
        items: [createPreparedImport().items[4]!],
        nextOrdinal: null,
      },
    });
    service.deleteRecord.mockResolvedValue({ ok: true, value: undefined });
    renderDialog({ service });

    expect(await screen.findByText('최근 가져오기')).toBeTruthy();
    expect(service.listIssues).not.toHaveBeenCalled();

    await user.click(
      screen.getByText('제외된 항목 확인', { selector: 'summary' })
    );

    await waitFor(() =>
      expect(service.listIssues).toHaveBeenCalledWith(JOB_ID, null)
    );
    expect(
      screen.getByText(
        (content, element) =>
          element?.tagName === 'LI' && content.includes('invalid-url')
      )
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '기록 삭제' }));
    expect(
      screen.getByText('인사이트는 유지되고 Undo 권한이 사라집니다')
    ).toBeTruthy();
    expect(service.deleteRecord).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '기록 삭제하기' }));

    expect(service.deleteRecord).toHaveBeenCalledWith(JOB_ID);
    await waitFor(() =>
      expect(screen.queryByText('붙여넣기 가져오기')).toBeNull()
    );
  });
});

function renderDialog({
  categories = [],
  onCategoriesChanged = vi.fn(),
  onLibraryChanged = vi.fn(),
  service,
}: {
  categories?: readonly Category[];
  onCategoriesChanged?: () => void | Promise<void>;
  onLibraryChanged?: () => void | Promise<void>;
  service: ReturnType<typeof createService>;
}) {
  return render(
    <DesignSystemProvider>
      <InsightImportDialog
        categories={categories}
        onCategoriesChanged={onCategoriesChanged}
        onLibraryChanged={onLibraryChanged}
        onOpenChange={vi.fn()}
        open
        service={service}
      />
    </DesignSystemProvider>
  );
}

function createService() {
  return {
    commit: vi.fn<InsightImportService['commit']>(),
    deleteRecord: vi.fn<InsightImportService['deleteRecord']>(),
    listHistory: vi
      .fn<InsightImportService['listHistory']>()
      .mockResolvedValue({ ok: true, value: [] }),
    listIssues: vi.fn<InsightImportService['listIssues']>(),
    prepare: vi.fn<InsightImportService['prepare']>(),
    retry: vi.fn<InsightImportService['retry']>(),
    undo: vi.fn<InsightImportService['undo']>(),
  };
}

function createPreparedImport(): PreparedImport {
  return {
    adapterKey: 'pasted-text',
    collections: [['개발']],
    expiresAt: '2026-07-26T03:00:00.000Z',
    id: JOB_ID,
    items: [
      createItem('new', 'https://example.com/a', null),
      createItem('new', 'https://example.com/b', null),
      createItem('existing_duplicate', 'https://example.com/existing', null),
      createItem('input_duplicate', 'https://example.com/a', null),
      createItem('excluded', 'not-a-url', 'invalid-url'),
    ],
    status: 'ready',
    summary: {
      createdCount: 0,
      duplicateCount: 1,
      excludedCount: 1,
      inputDuplicateCount: 1,
      newCount: 2,
      totalCount: 5,
    },
  };
}

function createItem(
  classification: PreparedImport['items'][number]['classification'],
  originalUrl: string,
  exclusionCode: PreparedImport['items'][number]['exclusionCode']
): PreparedImport['items'][number] {
  const hasValidUrl = exclusionCode === null;

  return {
    candidateId: `${classification}:${originalUrl}`,
    capturedAtCandidate: null,
    classification,
    collectionPath: ['개발'],
    domain: hasValidUrl ? 'example.com' : null,
    exclusionCode,
    explicitMemoCandidate: null,
    normalizedUrl: hasValidUrl ? originalUrl : null,
    originalUrl,
    sourceLocation: '1번째 줄',
    titleCandidate: null,
    warnings: [],
  };
}

function createHistoryEntry(): ImportHistoryEntry {
  return {
    adapterKey: 'pasted-text',
    completedAt: '2026-07-25T03:00:00.000Z',
    id: JOB_ID,
    status: 'completed',
    summary: {
      createdCount: 1,
      duplicateCount: 0,
      excludedCount: 1,
      inputDuplicateCount: 0,
      newCount: 1,
      totalCount: 2,
    },
    undoResult: null,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}
