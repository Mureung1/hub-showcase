import { useEffect, useState } from 'react';

import { Button } from '@/shared/ui';

import type {
  ImportAdapterKey,
  ImportHistoryEntry,
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

export type ImportHistoryProps = {
  entries: readonly ImportHistoryEntry[];
  errorMessage: string | null;
  loading: boolean;
  onDelete: (jobId: string) => Promise<void>;
  onUndo: (jobId: string) => Promise<void>;
};

export function ImportHistory({
  entries,
  errorMessage,
  loading,
  onDelete,
  onUndo,
}: ImportHistoryProps) {
  const [expiredUndoIds, setExpiredUndoIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<
    string | null
  >(null);
  const [undoConfirmationId, setUndoConfirmationId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const timeoutIds = entries
      .filter((entry) => entry.canUndo)
      .map((entry) =>
        window.setTimeout(() => {
          setExpiredUndoIds((current) => {
            if (current.has(entry.id)) {
              return current;
            }

            const next = new Set(current);
            next.add(entry.id);
            return next;
          });
        }, entry.undoRemainingMs)
      );

    return () =>
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  }, [entries]);

  async function confirmDelete(jobId: string) {
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
      {loading ? <p role="status">기록을 불러오고 있어요.</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      {!loading && entries.length === 0 ? (
        <p>아직 완료한 가져오기가 없어요.</p>
      ) : null}

      <ul className="insight-import-dialog__history-list">
        {entries.map((entry) => {
          const canUndo = entry.canUndo && !expiredUndoIds.has(entry.id);

          return (
            <li className="insight-import-dialog__history-item" key={entry.id}>
              <div>
                <strong>{getAdapterLabel(entry)}</strong>
                <span>{formatCompletedAt(entry.completedAt)}</span>
              </div>
              <p>
                추가 {entry.summary.createdCount}개 · 중복{' '}
                {entry.summary.duplicateCount}개 · 제외{' '}
                {entry.summary.excludedCount}개
              </p>

              <div className="insight-import-dialog__history-actions">
                {canUndo ? (
                  undoConfirmationId === entry.id ? (
                    <>
                      <p>이 가져오기를 되돌릴까요?</p>
                      <p>이 작업에서 새로 만든 인사이트만 삭제해요.</p>
                      <Button
                        onClick={() => void confirmUndo(entry.id)}
                        type="button"
                      >
                        가져오기 되돌리기
                      </Button>
                      <Button
                        hierarchy="ghost"
                        onClick={() => setUndoConfirmationId(null)}
                        type="button"
                      >
                        닫기
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
                ) : entry.status === 'completed' ? (
                  <p>되돌릴 수 있는 24시간이 지났어요.</p>
                ) : null}

                {deleteConfirmationId === entry.id ? (
                  <>
                    <p>
                      {canUndo
                        ? '인사이트는 유지하고 되돌리기 권한과 기록만 삭제해요.'
                        : '인사이트는 유지하고 가져오기 기록만 삭제해요.'}
                    </p>
                    <Button
                      onClick={() => void confirmDelete(entry.id)}
                      type="button"
                    >
                      가져오기 기록 삭제하기
                    </Button>
                    <Button
                      hierarchy="ghost"
                      onClick={() => setDeleteConfirmationId(null)}
                      type="button"
                    >
                      닫기
                    </Button>
                  </>
                ) : (
                  <Button
                    hierarchy="ghost"
                    onClick={() => setDeleteConfirmationId(entry.id)}
                    type="button"
                  >
                    가져오기 기록 삭제
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
