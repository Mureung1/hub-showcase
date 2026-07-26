import { useEffect, useMemo, useState } from 'react';

import { normalizeCategoryInput, type Category } from '@/entities/category';
import { Button, Modal, StatusMessage, TextArea } from '@/shared/ui';

import { createBrowserInsightImportService } from '../api/browser_insight_import_service';
import { bookmarkHtmlAdapter } from '../model/bookmark_html_adapter';
import type { InsightImportService } from '../model/insight_import_service';
import type { ImportCollectionMapping } from '../model/import_types';
import {
  genericCsvAdapter,
  genericJsonAdapter,
} from '../model/structured_file_adapter';
import {
  genericHtmlAdapter,
  genericMarkdownAdapter,
  genericTextAdapter,
} from '../model/text_file_adapter';
import { useInsightImport } from '../model/use_insight_import';
import { ImportFieldMappingForm } from './import_field_mapping';
import { ImportHistory } from './import_history';
import { ImportIssueDetails, ImportPreview } from './import_preview';

import './insight_import_dialog.css';

const FILE_ADAPTERS = [
  bookmarkHtmlAdapter,
  genericCsvAdapter,
  genericJsonAdapter,
  genericHtmlAdapter,
  genericMarkdownAdapter,
  genericTextAdapter,
] as const;

export type InsightImportDialogProps = {
  categories: readonly Category[];
  onCategoriesChanged: () => void | Promise<void>;
  onLibraryChanged: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  service?: InsightImportService;
};

export function InsightImportDialog({
  categories,
  onCategoriesChanged,
  onLibraryChanged,
  onOpenChange,
  open,
  service,
}: InsightImportDialogProps) {
  const importService = useMemo(
    () => service ?? createBrowserInsightImportService(),
    [service]
  );
  const controller = useInsightImport({
    fileAdapters: FILE_ADAPTERS,
    onCategoriesChanged,
    onLibraryChanged,
    service: importService,
  });
  const [sourceSelected, setSourceSelected] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [undoConfirming, setUndoConfirming] = useState(false);
  const { refreshHistory } = controller;

  useEffect(() => {
    if (open) {
      void refreshHistory();
    }
  }, [open, refreshHistory]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      controller.cancelCurrentOperation();
      setSourceSelected(false);
      setPastedText('');
      setUndoConfirming(false);
    }

    onOpenChange(nextOpen);
  }

  async function analyze() {
    await controller.analyzePastedText(pastedText);
  }

  async function confirmUndo() {
    if (!controller.result) {
      return;
    }

    await controller.undo(controller.result.jobId);
    setUndoConfirming(false);
  }

  const isSourceStage =
    controller.stage === 'source' || controller.stage === 'analyzing';
  const isPreviewStage =
    controller.stage === 'preview' || controller.stage === 'committing';
  const invalidNewCategory = hasInvalidNewCategoryMapping(controller.mappings);

  return (
    <Modal
      className="insight-import-dialog"
      description="다른 곳에 저장한 링크를 분석한 뒤 확인하고 가져옵니다."
      onOpenChange={handleOpenChange}
      open={open}
      size="large"
      title="보관함 가져오기"
    >
      {controller.errorMessage ? (
        <StatusMessage title="가져오기를 진행하지 못했어요" variant="error">
          {controller.errorMessage}
        </StatusMessage>
      ) : null}

      {isSourceStage ? (
        <div className="insight-import-dialog__source">
          <Button
            aria-pressed={sourceSelected}
            hierarchy={sourceSelected ? 'primary' : 'secondary'}
            onClick={() => setSourceSelected(true)}
            type="button"
          >
            링크 붙여넣기
          </Button>

          {sourceSelected ? (
            <div className="insight-import-dialog__paste">
              <label htmlFor="insight-import-pasted-text">가져올 링크</label>
              <TextArea
                disabled={controller.stage === 'analyzing'}
                id="insight-import-pasted-text"
                onChange={(event) => setPastedText(event.currentTarget.value)}
                rows={7}
                value={pastedText}
              />
              <Button
                disabled={
                  controller.stage === 'analyzing' ||
                  pastedText.trim().length === 0
                }
                hierarchy="primary"
                onClick={() => void analyze()}
                type="button"
              >
                {controller.stage === 'analyzing' ? '분석 중' : '분석하기'}
              </Button>
            </div>
          ) : null}

          <ImportHistory
            entries={controller.history}
            errorMessage={controller.historyErrorMessage}
            loading={controller.isHistoryLoading}
            onDelete={controller.deleteRecord}
            onUndo={controller.undo}
            service={importService}
          />
        </div>
      ) : null}

      {isPreviewStage && controller.prepared ? (
        <>
          <ImportPreview
            categories={categories}
            mappings={controller.mappings}
            onMappingChange={controller.setCollectionMapping}
            prepared={controller.prepared}
          />
          <div className="insight-import-dialog__actions">
            <Button hierarchy="ghost" onClick={controller.reset} type="button">
              다시 선택
            </Button>
            <Button
              disabled={
                controller.stage === 'committing' ||
                !controller.canCommit ||
                invalidNewCategory
              }
              hierarchy="primary"
              onClick={() => void controller.commit()}
              type="button"
            >
              {controller.stage === 'committing' ? '가져오는 중' : '가져오기'}
            </Button>
          </div>
        </>
      ) : null}

      {controller.stage === 'field-mapping' ? (
        <>
          <ImportFieldMappingForm
            onSubmit={(mappings) =>
              void controller.submitFieldMappings(mappings)
            }
            requests={controller.fieldMappingRequests}
          />
          <div className="insight-import-dialog__actions">
            <Button hierarchy="ghost" onClick={controller.reset} type="button">
              다시 선택
            </Button>
          </div>
        </>
      ) : null}

      {controller.stage === 'result' &&
      controller.prepared &&
      controller.result ? (
        <div className="insight-import-dialog__result">
          <section
            aria-label="가져오기를 완료했어요"
            aria-live="polite"
            className="insight-import-dialog__success"
            role="status"
          >
            <strong>가져오기를 완료했어요</strong>
            <p>
              인사이트 {controller.result.createdCount}개를 보관함에 추가했어요.
            </p>
          </section>

          <RaceDuplicateNotice
            preparedDuplicateCount={controller.prepared.summary.duplicateCount}
            resultDuplicateCount={controller.result.duplicateCount}
          />

          {controller.prepared.items.some(
            (item) =>
              item.classification === 'excluded' ||
              item.classification === 'input_duplicate'
          ) ? (
            <ImportIssueDetails
              items={controller.prepared.items.filter(
                (item) =>
                  item.classification === 'excluded' ||
                  item.classification === 'input_duplicate'
              )}
            />
          ) : null}

          {controller.result.undo ? (
            <p role="status">
              인사이트 {controller.result.undo.deletedCount}개를 되돌렸어요.
              {controller.result.undo.preservedCount > 0
                ? ` 사용자가 수정한 ${controller.result.undo.preservedCount}개는 유지했어요.`
                : ''}
            </p>
          ) : undoConfirming ? (
            <div className="insight-import-dialog__confirmation">
              <p>이 작업에서 새로 만든 인사이트만 삭제합니다.</p>
              <Button onClick={() => void confirmUndo()} type="button">
                정말 되돌리기
              </Button>
              <Button
                hierarchy="ghost"
                onClick={() => setUndoConfirming(false)}
                type="button"
              >
                취소
              </Button>
            </div>
          ) : (
            <Button
              hierarchy="secondary"
              onClick={() => setUndoConfirming(true)}
              type="button"
            >
              가져오기 되돌리기
            </Button>
          )}

          <div className="insight-import-dialog__actions">
            <Button hierarchy="ghost" onClick={controller.reset} type="button">
              다른 링크 가져오기
            </Button>
            <Button
              hierarchy="primary"
              onClick={() => handleOpenChange(false)}
              type="button"
            >
              완료
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function RaceDuplicateNotice({
  preparedDuplicateCount,
  resultDuplicateCount,
}: {
  preparedDuplicateCount: number;
  resultDuplicateCount: number;
}) {
  const racingDuplicateCount = Math.max(
    0,
    resultDuplicateCount - preparedDuplicateCount
  );

  return racingDuplicateCount > 0 ? (
    <p>
      분석 후 다른 경로에서 저장된 {racingDuplicateCount}개를 중복으로
      제외했어요
    </p>
  ) : null;
}

function hasInvalidNewCategoryMapping(
  mappings: readonly ImportCollectionMapping[]
) {
  return mappings.some(
    ({ target }) =>
      target.kind === 'new' && normalizeCategoryInput(target) === null
  );
}
