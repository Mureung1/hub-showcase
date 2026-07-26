import { useState, type SyntheticEvent } from 'react';

import { Button } from '@/shared/ui';

import type { InsightImportService } from '../model/insight_import_service';
import type {
  ImportAdapterKey,
  ImportHistoryEntry,
  ImportIssuePage,
} from '../model/import_types';

const IMPORT_ADAPTER_LABELS = {
  'bookmark-html': '브라우저 북마크',
  'generic-csv': 'CSV 파일',
  'generic-html': 'HTML 파일',
  'generic-json': 'JSON 파일',
  'generic-markdown': 'Markdown 파일',
  'generic-text': '텍스트 파일',
  notion: 'Notion',
  'pasted-text': '붙여넣기',
  zip: 'ZIP 파일',
} satisfies Record<ImportAdapterKey, string>;

type IssueState = ImportIssuePage & {
  errorMessage: string | null;
  loading: boolean;
};

export type ImportHistoryProps = {
  entries: readonly ImportHistoryEntry[];
  errorMessage: string | null;
  loading: boolean;
  onDelete: (jobId: string) => Promise<void>;
  onUndo: (jobId: string) => Promise<void>;
  service: InsightImportService;
};

export function ImportHistory({
  entries,
  errorMessage,
  loading,
  onDelete,
  onUndo,
  service,
}: ImportHistoryProps) {
  const [issueStates, setIssueStates] = useState<
    Record<string, IssueState | undefined>
  >({});
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<
    string | null
  >(null);
  const [undoConfirmationId, setUndoConfirmationId] = useState<string | null>(
    null
  );

  async function loadIssues(
    jobId: string,
    afterOrdinal: number | null,
    append: boolean
  ) {
    setIssueStates((current) => ({
      ...current,
      [jobId]: {
        errorMessage: null,
        items: append ? (current[jobId]?.items ?? []) : [],
        loading: true,
        nextOrdinal: current[jobId]?.nextOrdinal ?? null,
      },
    }));

    const result = await service.listIssues(jobId, afterOrdinal);

    if (!result.ok) {
      setIssueStates((current) => ({
        ...current,
        [jobId]: {
          errorMessage: '제외된 항목을 불러오지 못했습니다.',
          items: current[jobId]?.items ?? [],
          loading: false,
          nextOrdinal: null,
        },
      }));
      return;
    }

    setIssueStates((current) => ({
      ...current,
      [jobId]: {
        errorMessage: null,
        items: append
          ? [...(current[jobId]?.items ?? []), ...result.value.items]
          : result.value.items,
        loading: false,
        nextOrdinal: result.value.nextOrdinal,
      },
    }));
  }

  function openIssues(
    event: SyntheticEvent<HTMLDetailsElement>,
    entry: ImportHistoryEntry
  ) {
    if (event.currentTarget.open && !issueStates[entry.id]) {
      void loadIssues(entry.id, null, false);
    }
  }

  async function confirmDelete(jobId: string) {
    setIssueStates((current) => {
      const next = { ...current };
      delete next[jobId];
      return next;
    });
    setDeleteConfirmationId(null);
    await onDelete(jobId);
  }

  async function confirmUndo(jobId: string) {
    setUndoConfirmationId(null);
    await onUndo(jobId);
  }

  return (
    <section
      aria-labelledby="insight-import-history-title"
      className="insight-import-dialog__history"
    >
      <h3 id="insight-import-history-title">최근 가져오기</h3>
      {loading ? <p role="status">기록을 불러오는 중입니다.</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      {!loading && entries.length === 0 ? (
        <p>아직 완료한 가져오기가 없습니다.</p>
      ) : null}

      <ul className="insight-import-dialog__history-list">
        {entries.map((entry) => {
          const issueState = issueStates[entry.id];
          const hasIssues =
            entry.summary.excludedCount + entry.summary.inputDuplicateCount > 0;

          return (
            <li className="insight-import-dialog__history-item" key={entry.id}>
              <div>
                <strong>{getAdapterLabel(entry)}</strong>
                <span>{formatCompletedAt(entry.completedAt)}</span>
              </div>
              <p>
                생성 {entry.summary.createdCount}개 · 중복{' '}
                {entry.summary.duplicateCount}개 · 제외{' '}
                {entry.summary.excludedCount}개
              </p>

              {hasIssues ? (
                <details onToggle={(event) => openIssues(event, entry)}>
                  <summary>제외된 항목 확인</summary>
                  {issueState?.loading ? (
                    <p role="status">항목을 불러오는 중입니다.</p>
                  ) : null}
                  {issueState?.errorMessage ? (
                    <p role="alert">{issueState.errorMessage}</p>
                  ) : null}
                  {issueState?.items.length ? (
                    <ul>
                      {issueState.items.map((item) => (
                        <li key={item.candidateId}>
                          {item.sourceLocation} ·{' '}
                          {item.exclusionCode ?? item.classification}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {issueState?.nextOrdinal ? (
                    <Button
                      disabled={issueState.loading}
                      onClick={() =>
                        void loadIssues(entry.id, issueState.nextOrdinal, true)
                      }
                      type="button"
                    >
                      더 보기
                    </Button>
                  ) : null}
                </details>
              ) : null}

              <div className="insight-import-dialog__history-actions">
                {entry.status === 'completed' ? (
                  undoConfirmationId === entry.id ? (
                    <>
                      <p>이 작업에서 새로 만든 인사이트만 삭제합니다.</p>
                      <Button
                        onClick={() => void confirmUndo(entry.id)}
                        type="button"
                      >
                        정말 되돌리기
                      </Button>
                      <Button
                        hierarchy="ghost"
                        onClick={() => setUndoConfirmationId(null)}
                        type="button"
                      >
                        취소
                      </Button>
                    </>
                  ) : (
                    <Button
                      hierarchy="secondary"
                      onClick={() => setUndoConfirmationId(entry.id)}
                      type="button"
                    >
                      가져오기 되돌리기
                    </Button>
                  )
                ) : null}

                {deleteConfirmationId === entry.id ? (
                  <>
                    <p>인사이트는 유지되고 Undo 권한이 사라집니다</p>
                    <Button
                      onClick={() => void confirmDelete(entry.id)}
                      type="button"
                    >
                      기록 삭제하기
                    </Button>
                    <Button
                      hierarchy="ghost"
                      onClick={() => setDeleteConfirmationId(null)}
                      type="button"
                    >
                      취소
                    </Button>
                  </>
                ) : (
                  <Button
                    hierarchy="ghost"
                    onClick={() => setDeleteConfirmationId(entry.id)}
                    type="button"
                  >
                    기록 삭제
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function getAdapterLabel(entry: ImportHistoryEntry) {
  return `${IMPORT_ADAPTER_LABELS[entry.adapterKey]} 가져오기`;
}

function formatCompletedAt(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
