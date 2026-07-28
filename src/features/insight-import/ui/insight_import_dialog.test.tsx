/* @vitest-environment jsdom */
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Category } from '@/entities/category';
import { DesignSystemProvider } from '@/shared/ui/design-system-provider';

import type { InsightImportService } from '../model/insight_import_service';
import type { ImportHistoryEntry, PreparedImport } from '../model/import_types';
import type { NotionImportApi } from '../api/notion_import_api';
import { ImportHistory } from './import_history';
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
  it('가져올 위치를 하나의 선택 그룹으로 제공한다', async () => {
    const user = userEvent.setup();
    renderDialog({ service: createService() });

    const sourceGroup = screen.getByRole('group', { name: '가져올 위치' });
    const fileButton = within(sourceGroup).getByRole('button', {
      name: '파일에서 가져오기',
    });
    const notionButton = within(sourceGroup).getByRole('button', {
      name: 'Notion에서 가져오기',
    });
    const pasteButton = within(sourceGroup).getByRole('button', {
      name: '링크 붙여넣기',
    });

    expect(
      within(fileButton).getByText('파일').getAttribute('aria-hidden')
    ).toBe('true');
    expect(
      within(notionButton).getByText('Notion').getAttribute('aria-hidden')
    ).toBe('true');
    expect(
      within(pasteButton).getByText('링크').getAttribute('aria-hidden')
    ).toBe('true');
    expect(fileButton.getAttribute('aria-pressed')).toBe('false');

    await user.click(fileButton);

    expect(fileButton.getAttribute('aria-pressed')).toBe('true');
    expect(notionButton.getAttribute('aria-pressed')).toBe('false');
    expect(pasteButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('원본 파일을 업로드하지 않고 자동 감지한 후보만 준비 요청한다', async () => {
    const user = userEvent.setup();
    const service = createService();
    service.prepare.mockImplementation(async (input) => ({
      ok: true,
      value: {
        ...createPreparedImport(),
        adapterKey: input.adapterKey,
      },
    }));
    renderDialog({ service });

    await user.click(screen.getByRole('button', { name: '파일에서 가져오기' }));
    expect(
      screen.getByText(/원본 파일은 서버에 업로드하지 않으며/)
    ).toBeTruthy();

    await user.upload(
      screen.getByLabelText('가져올 파일'),
      new File(['https://example.com/from-file'], 'private-links.txt', {
        type: 'text/plain',
      })
    );

    expect(await screen.findByText('신규')).toBeTruthy();
    expect(service.prepare).toHaveBeenCalledWith(
      expect.objectContaining({
        adapterKey: 'generic-text',
        inputKind: 'file',
      })
    );
    expect(JSON.stringify(service.prepare.mock.calls[0]?.[0])).not.toContain(
      'private-links.txt'
    );
  });

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

    const sourceGroup = screen.getByRole('group', { name: '가져올 위치' });
    const sourceButtons = within(sourceGroup).getAllByRole('button');

    expect(
      sourceButtons.every((button) => (button as HTMLButtonElement).disabled)
    ).toBe(true);

    deferred.resolve({ ok: false, reason: 'write-failed' });

    const pastePanel = screen.getByRole('region', {
      name: '링크 붙여넣기',
    });
    const alert = await within(pastePanel).findByRole('alert', {
      name: '가져오기를 진행하지 못했어요',
    });
    expect(alert.textContent).not.toContain('https://example.com');

    await user.click(
      within(sourceGroup).getByRole('button', {
        name: '파일에서 가져오기',
      })
    );

    expect(
      screen.queryByRole('alert', {
        name: '가져오기를 진행하지 못했어요',
      })
    ).toBeNull();

    await user.click(
      within(sourceGroup).getByRole('button', {
        name: '링크 붙여넣기',
      })
    );

    expect(
      (
        screen.getByRole('textbox', {
          name: '가져올 링크',
        }) as HTMLTextAreaElement
      ).value
    ).toBe('https://example.com');
  });

  it('최근 기록은 요약만 표시하고 경고 뒤 기록을 삭제한다', async () => {
    const user = userEvent.setup();
    const service = createService();
    service.listHistory.mockResolvedValue({
      ok: true,
      value: [createHistoryEntry()],
    });
    service.deleteRecord.mockResolvedValue({ ok: true, value: undefined });
    renderDialog({ service });

    expect(await screen.findByText('최근 가져오기')).toBeTruthy();
    expect(service.listIssues).not.toHaveBeenCalled();
    expect(screen.getByText(/생성 1개 · 중복 0개 · 제외 1개/)).toBeTruthy();
    expect(screen.queryByText('제외된 항목 확인')).toBeNull();

    await user.click(screen.getByRole('button', { name: '기록 삭제' }));
    expect(
      screen.getByText('인사이트는 유지되고 되돌리기 권한과 기록이 사라집니다.')
    ).toBeTruthy();
    expect(service.deleteRecord).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '기록 삭제하기' }));

    expect(service.deleteRecord).toHaveBeenCalledWith(JOB_ID);
    await waitFor(() =>
      expect(screen.queryByText('붙여넣기 가져오기')).toBeNull()
    );
  });

  it('24시간이 지난 완료 기록은 되돌리기 안내만 표시한다', async () => {
    const service = createService();
    service.listHistory.mockResolvedValue({
      ok: true,
      value: [
        {
          ...createHistoryEntry(),
          canUndo: false,
          undoExpiresAt: '2000-01-01T00:00:00.000Z',
          undoRemainingMs: 0,
        },
      ],
    });
    renderDialog({ service });

    expect(
      await screen.findByText('되돌릴 수 있는 24시간이 지났어요.')
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: '가져오기 되돌리기' })
    ).toBeNull();
  });

  it('되돌릴 수 있는 기록은 첫 렌더부터 되돌리기 버튼을 표시한다', () => {
    const markup = renderToStaticMarkup(
      <DesignSystemProvider>
        <ImportHistory
          entries={[createHistoryEntry()]}
          errorMessage={null}
          loading={false}
          onDelete={vi.fn()}
          onUndo={vi.fn()}
        />
      </DesignSystemProvider>
    );

    expect(markup).toContain('가져오기 되돌리기');
    expect(markup).not.toContain('되돌릴 수 있는 24시간이 지났어요.');
  });

  it('서버가 계산한 남은 시간이 지나면 되돌리기 버튼을 숨긴다', async () => {
    vi.useFakeTimers();

    try {
      render(
        <DesignSystemProvider>
          <ImportHistory
            entries={[
              { ...createHistoryEntry(), undoRemainingMs: 1_000 },
            ]}
            errorMessage={null}
            loading={false}
            onDelete={vi.fn()}
            onUndo={vi.fn()}
          />
        </DesignSystemProvider>
      );

      expect(
        screen.getByRole('button', { name: '가져오기 되돌리기' })
      ).toBeTruthy();

      await act(() => vi.advanceTimersByTimeAsync(1_000));

      expect(
        screen.getByText('되돌릴 수 있는 24시간이 지났어요.')
      ).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('Notion 공식 연결 안내와 기본값이 꺼진 페이지 주소 선택을 제공한다', async () => {
    const user = userEvent.setup();
    const notionApi = createNotionApi();
    const openWeb = vi.fn();
    notionApi.start.mockResolvedValue({
      authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
      connectionId: JOB_ID,
    });

    renderDialog({
      notionApi,
      notionOpenWeb: openWeb,
      service: createService(),
    });

    await user.click(
      screen.getByRole('button', { name: 'Notion에서 가져오기' })
    );
    expect(
      screen.getByText(
        'Notion 공식 화면에서 가져올 페이지를 직접 선택합니다. 읽기 권한만 사용하고 가져오기가 끝나면 연결을 해제합니다.'
      )
    ).toBeTruthy();
    const includePages = screen.getByRole('checkbox', {
      name: 'Notion 페이지 자체 주소도 가져오기',
    });
    expect((includePages as HTMLInputElement).checked).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Notion 연결하기' }));

    expect(notionApi.start).toHaveBeenCalledWith(
      false,
      'web',
      expect.any(AbortSignal)
    );
    expect(openWeb).toHaveBeenCalledWith(
      'https://api.notion.com/v1/oauth/authorize'
    );
  });

  it('Notion field mapping에 데이터베이스 이름을 표시한다', async () => {
    const notionApi = createNotionApi();
    notionApi.status.mockResolvedValue({
      connectionId: JOB_ID,
      includePageUrls: false,
      jobId: JOB_ID,
      jobStatus: 'analyzing',
      status: 'connected',
      workspaceName: '팀 문서',
    });
    notionApi.analyze.mockResolvedValue({
      candidateCount: 0,
      mappingRequests: [
        {
          dataSourceId: 'data-source-id',
          dataSourceName: '업무 자료',
          fields: [
            { id: 'url-field', name: 'URL', type: 'url' },
            { id: 'text-field', name: '링크', type: 'rich_text' },
          ],
          suggestedUrlPropertyId: 'url-field',
        },
      ],
      requestCount: 2,
      status: 'mapping-required',
    });

    renderDialog({
      initialNotionConnectionId: JOB_ID,
      notionApi,
      service: createService(),
    });

    expect(
      await screen.findByText('Notion 데이터베이스 · 업무 자료')
    ).toBeTruthy();
    expect(screen.queryByText(/data-source-id/)).toBeNull();
  });
});

function renderDialog({
  categories = [],
  initialNotionConnectionId = null,
  onCategoriesChanged = vi.fn(),
  onLibraryChanged = vi.fn(),
  service,
  notionApi,
  notionOpenWeb,
}: {
  categories?: readonly Category[];
  initialNotionConnectionId?: string | null;
  onCategoriesChanged?: () => void | Promise<void>;
  onLibraryChanged?: () => void | Promise<void>;
  service: ReturnType<typeof createService>;
  notionApi?: ReturnType<typeof createNotionApi>;
  notionOpenWeb?: (url: string) => void;
}) {
  return render(
    <DesignSystemProvider>
      <InsightImportDialog
        categories={categories}
        initialNotionConnectionId={initialNotionConnectionId}
        onCategoriesChanged={onCategoriesChanged}
        onLibraryChanged={onLibraryChanged}
        onOpenChange={vi.fn()}
        notionApi={notionApi}
        notionOpenWeb={notionOpenWeb}
        open
        service={service}
      />
    </DesignSystemProvider>
  );
}

function createNotionApi() {
  return {
    analyze: vi.fn<NotionImportApi['analyze']>(),
    cancel: vi.fn<NotionImportApi['cancel']>(),
    complete: vi.fn<NotionImportApi['complete']>(),
    start: vi.fn<NotionImportApi['start']>(),
    status: vi.fn<NotionImportApi['status']>(),
  };
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
    canUndo: true,
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
    undoExpiresAt: '2099-07-26T03:00:00.000Z',
    undoRemainingMs: 86_400_000,
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
