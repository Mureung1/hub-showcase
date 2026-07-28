import { useEffect, useMemo, useRef, useState } from 'react';

import { normalizeCategoryInput, type Category } from '@/entities/category';
import {
  createDefaultNotionImportCallback,
  type NotionImportCallback,
} from '@/shared/capacitor';
import { Button, Modal, Select, StatusMessage, TextArea } from '@/shared/ui';

import { createBrowserInsightImportService } from '../api/browser_insight_import_service';
import {
  createNotionImportApi,
  type NotionFieldMapping,
  type NotionFieldMappingRequest,
  type NotionImportApi,
} from '../api/notion_import_api';
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
import { useNotionImport } from '../model/use_notion_import';
import { zipFileAdapter } from '../model/zip_file_adapter';
import { ImportFieldMappingForm } from './import_field_mapping';
import { ImportHistory } from './import_history';
import { ImportIssueDetails, ImportPreview } from './import_preview';
import {
  INSIGHT_IMPORT_SOURCE_LABELS,
  type InsightImportSource,
} from './insight_import_source';
import { InsightImportSourceSelector } from './insight_import_source_selector';

import './insight_import_dialog.css';

const FILE_ADAPTERS = [
  zipFileAdapter,
  bookmarkHtmlAdapter,
  genericCsvAdapter,
  genericJsonAdapter,
  genericHtmlAdapter,
  genericMarkdownAdapter,
  genericTextAdapter,
] as const;
const IMPORT_FIELD_MAPPING_FORM_ID = 'insight-import-field-mapping-form';
const NOTION_FIELD_MAPPING_FORM_ID = 'insight-import-notion-field-mapping-form';

export type InsightImportDialogProps = {
  categories: readonly Category[];
  onCategoriesChanged: () => void | Promise<void>;
  onLibraryChanged: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  initialNotionConnectionId?: string | null;
  initialNotionError?: 'access-denied' | null;
  notionApi?: NotionImportApi;
  notionCallback?: NotionImportCallback;
  onNotionConnectionFinished?: () => void;
  notionOpenWeb?: (authorizeUrl: string) => void;
  service?: InsightImportService;
};

export function InsightImportDialog({
  categories,
  onCategoriesChanged,
  onLibraryChanged,
  onOpenChange,
  open,
  initialNotionConnectionId = null,
  initialNotionError = null,
  notionApi,
  notionCallback,
  notionOpenWeb,
  onNotionConnectionFinished,
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
  const resolvedNotionApi = useMemo(
    () => notionApi ?? createNotionImportApi(),
    [notionApi]
  );
  const resolvedNotionCallback = useMemo(
    () => notionCallback ?? createDefaultNotionImportCallback(),
    [notionCallback]
  );
  const notion = useNotionImport({
    api: resolvedNotionApi,
    callback: resolvedNotionCallback,
    initialConnectionId: initialNotionConnectionId,
    initialError: initialNotionError,
    onConnectionFinished: onNotionConnectionFinished,
    onPrepared: controller.loadPrepared,
    openWeb: notionOpenWeb,
  });
  const [sourceSelected, setSourceSelected] =
    useState<InsightImportSource | null>(
      initialNotionConnectionId || initialNotionError ? 'notion' : null
    );
  const [controllerErrorSource, setControllerErrorSource] = useState<Exclude<
    InsightImportSource,
    'notion'
  > | null>(null);
  const [includeNotionPageUrls, setIncludeNotionPageUrls] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [undoConfirming, setUndoConfirming] = useState(false);
  const completedNotionJobRef = useRef<string | null>(null);
  const { refreshHistory } = controller;

  useEffect(() => {
    if (open) {
      void refreshHistory();
    }
  }, [open, refreshHistory]);

  useEffect(() => {
    if (
      controller.stage === 'result' &&
      notion.connectionId === controller.result?.jobId &&
      completedNotionJobRef.current !== notion.connectionId
    ) {
      completedNotionJobRef.current = notion.connectionId;
      void notion.complete();
    }
  }, [controller.result?.jobId, controller.stage, notion]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      if (
        ['analyzing', 'connecting', 'mapping'].includes(notion.stage) &&
        !globalThis.confirm('Notion 연결을 그만두고 가져오기 창을 닫을까요?')
      ) {
        return;
      }
      if (notion.connectionId && controller.stage !== 'result') {
        void notion.cancel();
      }
      controller.cancelCurrentOperation();
      setSourceSelected(null);
      setControllerErrorSource(null);
      setPastedText('');
      setUndoConfirming(false);
    }

    onOpenChange(nextOpen);
  }

  async function analyze() {
    setControllerErrorSource('paste');
    await controller.analyzePastedText(pastedText);
  }

  async function analyzeFile(file: File | undefined) {
    if (file) {
      setControllerErrorSource('file');
      await controller.analyzeFile(file);
    }
  }

  function resetSource() {
    if (notion.connectionId) {
      void notion.cancel();
    }
    controller.reset();
    setSourceSelected(null);
    setControllerErrorSource(null);
    setPastedText('');
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
  const isSourceLocked =
    controller.stage === 'analyzing' ||
    ['connecting', 'analyzing', 'mapping'].includes(notion.stage);
  const sourceHeadingId = sourceSelected
    ? `insight-import-${sourceSelected}-title`
    : undefined;

  function renderDialogFooter() {
    if (isPreviewStage && controller.prepared) {
      return (
        <>
          <Button hierarchy="ghost" onClick={resetSource} type="button">
            가져올 위치 다시 선택하기
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
            {controller.stage === 'committing'
              ? '인사이트를 가져오고 있어요'
              : '인사이트 가져오기'}
          </Button>
        </>
      );
    }

    if (controller.stage === 'field-mapping') {
      return (
        <>
          <Button hierarchy="ghost" onClick={resetSource} type="button">
            가져올 위치 다시 선택하기
          </Button>
          <Button
            form={IMPORT_FIELD_MAPPING_FORM_ID}
            hierarchy="primary"
            type="submit"
          >
            가져올 내용 확인하기
          </Button>
        </>
      );
    }

    if (
      controller.stage === 'result' &&
      controller.prepared &&
      controller.result
    ) {
      return (
        <>
          <Button hierarchy="ghost" onClick={resetSource} type="button">
            다른 링크 가져오기
          </Button>
          <Button
            hierarchy="primary"
            onClick={() => handleOpenChange(false)}
            type="button"
          >
            보관함으로 돌아가기
          </Button>
        </>
      );
    }

    if (!isSourceStage) {
      return null;
    }

    const closeButton = (
      <Button
        hierarchy="ghost"
        onClick={() => handleOpenChange(false)}
        type="button"
      >
        닫기
      </Button>
    );

    if (controller.stage === 'analyzing') {
      return (
        <>
          {closeButton}
          <Button disabled hierarchy="primary" type="button">
            가져올 내용을 확인하고 있어요
          </Button>
        </>
      );
    }

    if (sourceSelected === 'paste') {
      return (
        <>
          {closeButton}
          <Button
            disabled={pastedText.trim().length === 0}
            hierarchy="primary"
            onClick={() => void analyze()}
            type="button"
          >
            가져올 내용 확인하기
          </Button>
        </>
      );
    }

    if (sourceSelected === 'notion') {
      if (notion.stage === 'idle' || notion.stage === 'error') {
        return (
          <>
            {closeButton}
            <Button
              hierarchy="primary"
              onClick={() => void notion.start(includeNotionPageUrls)}
              type="button"
            >
              Notion 연결하기
            </Button>
          </>
        );
      }

      if (notion.stage === 'mapping') {
        return (
          <>
            <Button
              hierarchy="ghost"
              onClick={() => void notion.cancel()}
              type="button"
            >
              Notion 연결 그만두기
            </Button>
            <Button
              form={NOTION_FIELD_MAPPING_FORM_ID}
              hierarchy="primary"
              type="submit"
            >
              가져올 내용 확인하기
            </Button>
          </>
        );
      }

      if (notion.stage === 'connecting' || notion.stage === 'analyzing') {
        return (
          <Button
            hierarchy="secondary"
            onClick={() => void notion.cancel()}
            type="button"
          >
            Notion 연결 그만두기
          </Button>
        );
      }
    }

    return closeButton;
  }

  return (
    <Modal
      className="insight-import-dialog"
      description="다른 곳에 저장한 링크를 확인한 뒤 보관함으로 가져와요."
      footer={renderDialogFooter()}
      onOpenChange={handleOpenChange}
      open={open}
      size="large"
      title="인사이트 가져오기"
    >
      {isSourceStage ? (
        <div className="insight-import-dialog__stage insight-import-dialog__stage--source">
          <InsightImportSourceSelector
            disabled={isSourceLocked}
            onSelect={setSourceSelected}
            selected={sourceSelected}
          />

          <section
            aria-label={sourceSelected ? undefined : '가져오기 작업'}
            aria-labelledby={sourceHeadingId}
            className="insight-import-dialog__source-panel"
          >
            {sourceSelected ? (
              <h3 id={sourceHeadingId}>
                {INSIGHT_IMPORT_SOURCE_LABELS[sourceSelected]}
              </h3>
            ) : (
              <p className="insight-import-dialog__source-prompt">
                가져올 위치를 선택해 주세요.
              </p>
            )}

            {controller.errorMessage &&
            controllerErrorSource === sourceSelected ? (
              <StatusMessage
                title="가져오기를 진행하지 못했어요"
                variant="error"
              >
                {controller.errorMessage}
              </StatusMessage>
            ) : null}

            {sourceSelected === 'notion' && notion.errorMessage ? (
              <StatusMessage
                title="Notion 연결을 확인해 주세요"
                variant="error"
              >
                {notion.errorMessage}
              </StatusMessage>
            ) : null}

            {sourceSelected === 'file' ? (
              <div className="insight-import-dialog__file">
                <label htmlFor="insight-import-file">가져올 파일</label>
                <input
                  accept=".csv,.json,.html,.htm,.md,.markdown,.txt,.zip"
                  aria-describedby="insight-import-file-help"
                  disabled={controller.stage === 'analyzing'}
                  id="insight-import-file"
                  onChange={(event) =>
                    void analyzeFile(event.currentTarget.files?.[0])
                  }
                  type="file"
                />
                <p id="insight-import-file-help">
                  CSV, JSON, HTML, Markdown, 텍스트, ZIP을 지원해요. 원본 파일은
                  서버에 올리지 않아요. 일반 파일은 10 MiB, ZIP은 20 MiB까지
                  선택할 수 있어요.
                </p>
              </div>
            ) : null}

            {sourceSelected === 'paste' ? (
              <div className="insight-import-dialog__paste">
                <label htmlFor="insight-import-pasted-text">가져올 링크</label>
                <TextArea
                  disabled={controller.stage === 'analyzing'}
                  id="insight-import-pasted-text"
                  onChange={(event) => setPastedText(event.currentTarget.value)}
                  rows={7}
                  value={pastedText}
                />
              </div>
            ) : null}

            {sourceSelected === 'notion' ? (
              <div className="insight-import-dialog__notion">
                <p>
                  Notion에서 가져올 페이지를 직접 선택해요. 읽기 권한만 사용하고
                  가져오기가 끝나면 연결을 해제해요.
                </p>

                {notion.stage === 'idle' || notion.stage === 'error' ? (
                  <>
                    <label className="insight-import-dialog__notion-checkbox">
                      <input
                        checked={includeNotionPageUrls}
                        onChange={(event) =>
                          setIncludeNotionPageUrls(event.currentTarget.checked)
                        }
                        type="checkbox"
                      />
                      Notion 페이지 자체 주소도 가져오기
                    </label>
                    <p>
                      Notion 안에 저장한 외부 링크가 아니라 선택한 페이지도
                      원문으로 보관할 때만 사용해요.
                    </p>
                  </>
                ) : null}

                {notion.stage === 'connecting' ||
                notion.stage === 'analyzing' ? (
                  <section aria-live="polite" role="status">
                    <strong>
                      {notion.workspaceName ?? 'Notion 작업 공간'}에서 가져올
                      내용을 확인하고 있어요
                    </strong>
                    <p>
                      요청 {notion.requestCount}개를 확인했고 후보{' '}
                      {notion.candidateCount}개를 찾았어요.
                    </p>
                  </section>
                ) : null}

                {notion.stage === 'mapping' ? (
                  <NotionFieldMappingForm
                    formId={NOTION_FIELD_MAPPING_FORM_ID}
                    onSubmit={(mappings) =>
                      void notion.submitMappings(mappings)
                    }
                    requests={notion.mappingRequests}
                  />
                ) : null}
              </div>
            ) : null}

            {notion.stage === 'idle' || notion.stage === 'error' ? (
              <ImportHistory
                entries={controller.history}
                errorMessage={controller.historyErrorMessage}
                loading={controller.isHistoryLoading}
                onDelete={controller.deleteRecord}
                onUndo={controller.undo}
              />
            ) : null}
          </section>
        </div>
      ) : null}

      {isPreviewStage && controller.prepared ? (
        <div className="insight-import-dialog__stage insight-import-dialog__stage--single">
          <ImportPreview
            categories={categories}
            mappings={controller.mappings}
            onMappingChange={controller.setCollectionMapping}
            prepared={controller.prepared}
          />
        </div>
      ) : null}

      {controller.stage === 'field-mapping' ? (
        <div className="insight-import-dialog__stage insight-import-dialog__stage--single">
          <ImportFieldMappingForm
            formId={IMPORT_FIELD_MAPPING_FORM_ID}
            onSubmit={(mappings) =>
              void controller.submitFieldMappings(mappings)
            }
            requests={controller.fieldMappingRequests}
            showSubmitButton={false}
          />
        </div>
      ) : null}

      {controller.stage === 'result' &&
      controller.prepared &&
      controller.result ? (
        <div className="insight-import-dialog__result insight-import-dialog__stage insight-import-dialog__stage--single">
          <section
            aria-label={`인사이트 ${controller.result.createdCount}개를 보관함에 추가했어요`}
            aria-live="polite"
            className="insight-import-dialog__success"
            role="status"
          >
            <strong>
              인사이트 {controller.result.createdCount}개를 보관함에 추가했어요
            </strong>
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
              인사이트 {controller.result.undo.deletedCount}개를 보관함에서
              삭제했어요.
              {controller.result.undo.preservedCount > 0
                ? ` 직접 수정한 ${controller.result.undo.preservedCount}개는 그대로 두었어요.`
                : ''}
            </p>
          ) : undoConfirming ? (
            <div className="insight-import-dialog__confirmation">
              <p>이 가져오기를 되돌릴까요?</p>
              <p>이 작업에서 새로 만든 인사이트만 삭제해요.</p>
              <Button onClick={() => void confirmUndo()} type="button">
                가져오기 되돌리기
              </Button>
              <Button
                hierarchy="ghost"
                onClick={() => setUndoConfirming(false)}
                type="button"
              >
                닫기
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
        </div>
      ) : null}
    </Modal>
  );
}

function NotionFieldMappingForm({
  formId,
  ...props
}: {
  formId: string;
  onSubmit: (mappings: NotionFieldMapping[]) => void;
  requests: NotionFieldMappingRequest[];
}) {
  return (
    <NotionFieldMappingFields
      formId={formId}
      key={JSON.stringify(props.requests)}
      {...props}
    />
  );
}

function NotionFieldMappingFields({
  formId,
  onSubmit,
  requests,
}: {
  formId: string;
  onSubmit: (mappings: NotionFieldMapping[]) => void;
  requests: NotionFieldMappingRequest[];
}) {
  const unusedField = '__unused__';
  const [mappings, setMappings] = useState<NotionFieldMapping[]>(() =>
    requests.map((request) => ({
      dataSourceId: request.dataSourceId,
      memoPropertyId: null,
      titlePropertyId: null,
      urlPropertyId: request.suggestedUrlPropertyId,
    }))
  );

  return (
    <form
      className="insight-import-dialog__field-mapping"
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(mappings);
      }}
    >
      <div>
        <h3>Notion 필드 연결</h3>
        <p>각 데이터베이스에서 링크가 담긴 필드를 선택해 주세요.</p>
      </div>
      {requests.map((request) => {
        const mapping = mappings.find(
          (value) => value.dataSourceId === request.dataSourceId
        );
        if (!mapping) {
          return null;
        }
        const options = request.fields.map((field) => ({
          label: `${field.name} · ${field.type === 'url' ? 'URL' : '텍스트'}`,
          value: field.id,
        }));
        const optionalOptions = [
          { label: '사용하지 않음', value: unusedField },
          ...options,
        ];
        const updateMapping = (
          field: 'memoPropertyId' | 'titlePropertyId' | 'urlPropertyId',
          value: string
        ) => {
          setMappings((current) =>
            current.map((currentMapping) =>
              currentMapping.dataSourceId === request.dataSourceId
                ? {
                    ...currentMapping,
                    [field]:
                      field === 'urlPropertyId' || value !== unusedField
                        ? value
                        : null,
                  }
                : currentMapping
            )
          );
        };

        return (
          <fieldset key={request.dataSourceId}>
            <legend>Notion 데이터베이스 · {request.dataSourceName}</legend>
            <label>
              URL 필드
              <Select
                aria-label={`${request.dataSourceName} URL 필드`}
                onValueChange={(value) => updateMapping('urlPropertyId', value)}
                options={options}
                value={mapping.urlPropertyId}
              />
            </label>
            <label>
              제목 필드
              <Select
                aria-label={`${request.dataSourceName} 제목 필드`}
                onValueChange={(value) =>
                  updateMapping('titlePropertyId', value)
                }
                options={optionalOptions}
                value={mapping.titlePropertyId ?? unusedField}
              />
            </label>
            <label>
              메모 필드
              <Select
                aria-label={`${request.dataSourceName} 메모 필드`}
                onValueChange={(value) =>
                  updateMapping('memoPropertyId', value)
                }
                options={optionalOptions}
                value={mapping.memoPropertyId ?? unusedField}
              />
            </label>
          </fieldset>
        );
      })}
    </form>
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
      분석 후 다른 경로에서 저장된 인사이트 {racingDuplicateCount}개를 중복으로
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
