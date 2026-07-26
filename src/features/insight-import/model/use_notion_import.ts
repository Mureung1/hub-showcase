import { useCallback, useEffect, useRef, useState } from 'react';

import type { NotionImportCallback } from '@/shared/capacitor';

import {
  createNotionImportApi,
  NotionImportApiError,
  type NotionFieldMapping,
  type NotionFieldMappingRequest,
  type NotionImportApi,
} from '../api/notion_import_api';
import type { PreparedImport } from './import_types';

export type NotionImportStage =
  'idle' | 'connecting' | 'analyzing' | 'mapping' | 'ready' | 'error';

export type UseNotionImportOptions = {
  analysisDelayMs?: number;
  api?: NotionImportApi;
  callback?: NotionImportCallback;
  initialConnectionId?: string | null;
  onPrepared(prepared: PreparedImport): void;
  openWeb?: (authorizeUrl: string) => void;
};

export function useNotionImport({
  analysisDelayMs = 500,
  api = createNotionImportApi(),
  callback,
  initialConnectionId = null,
  onPrepared,
  openWeb = (authorizeUrl) => window.location.assign(authorizeUrl),
}: UseNotionImportOptions) {
  const [stage, setStage] = useState<NotionImportStage>('idle');
  const [connectionId, setConnectionId] = useState<string | null>(
    initialConnectionId
  );
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [candidateCount, setCandidateCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [mappingRequests, setMappingRequests] = useState<
    NotionFieldMappingRequest[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const activeConnectionRef = useRef<string | null>(initialConnectionId);

  const abortCurrent = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = undefined;
  }, []);

  const analyze = useCallback(
    async (
      nextConnectionId: string,
      mappings: NotionFieldMapping[],
      controller: AbortController
    ) => {
      let rateLimitRetryCount = 0;

      for (;;) {
        try {
          const result = await api.analyze(
            nextConnectionId,
            mappings,
            controller.signal
          );
          rateLimitRetryCount = 0;
          setCandidateCount(result.candidateCount);
          setRequestCount((current) => current + result.requestCount);

          if (result.status === 'mapping-required') {
            setMappingRequests(result.mappingRequests);
            setStage('mapping');
            return;
          }

          if (result.status === 'ready') {
            setStage('ready');
            onPrepared(result.prepared);
            return;
          }

          await wait(analysisDelayMs, controller.signal);
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }
          if (
            error instanceof NotionImportApiError &&
            error.reason === 'provider-rate-limited' &&
            rateLimitRetryCount < 3
          ) {
            rateLimitRetryCount += 1;
            await wait(
              error.retryAfterMs ?? 500 * 2 ** (rateLimitRetryCount - 1),
              controller.signal
            );
            continue;
          }
          throw error;
        }
      }
    },
    [analysisDelayMs, api, onPrepared]
  );

  const resume = useCallback(
    async (nextConnectionId: string, mappings: NotionFieldMapping[] = []) => {
      abortCurrent();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeConnectionRef.current = nextConnectionId;
      setConnectionId(nextConnectionId);
      setStage('analyzing');
      setErrorMessage(null);

      try {
        const status = await api.status(nextConnectionId, controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        setWorkspaceName(status.workspaceName);
        await analyze(nextConnectionId, mappings, controller);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setStage('error');
        setErrorMessage(getErrorMessage(error));
      }
    },
    [abortCurrent, analyze, api]
  );

  useEffect(() => {
    let active = true;

    if (initialConnectionId) {
      queueMicrotask(() => {
        if (active) {
          void resume(initialConnectionId);
        }
      });
    }

    return () => {
      active = false;
      abortCurrent();
    };
  }, [abortCurrent, initialConnectionId, resume]);

  useEffect(
    () => callback?.subscribe((id) => void resume(id)),
    [callback, resume]
  );

  return {
    candidateCount,
    connectionId,
    errorMessage,
    mappingRequests,
    requestCount,
    stage,
    workspaceName,

    async cancel() {
      const currentConnectionId = activeConnectionRef.current;
      abortCurrent();

      if (currentConnectionId) {
        try {
          await api.cancel(currentConnectionId);
        } catch {
          setErrorMessage(
            '연결 정리가 예약되었어요. 보관함 내용은 바뀌지 않았습니다.'
          );
        }
      }

      activeConnectionRef.current = null;
      setConnectionId(null);
      setStage('idle');
    },

    async complete() {
      const currentConnectionId = activeConnectionRef.current;
      if (!currentConnectionId) {
        return;
      }

      try {
        const result = await api.complete(currentConnectionId);
        if (result.status === 'cleanup-pending') {
          setErrorMessage(
            '가져오기는 완료됐고 연결 해제는 자동으로 다시 시도합니다.'
          );
        }
      } catch {
        setErrorMessage(
          '가져오기는 완료됐고 연결 해제는 자동으로 다시 시도합니다.'
        );
      }
    },

    resume,

    async start(includePageUrls: boolean) {
      abortCurrent();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setStage('connecting');
      setErrorMessage(null);

      try {
        const result = await api.start(
          includePageUrls,
          callback ? 'android' : 'web',
          controller.signal
        );
        activeConnectionRef.current = result.connectionId;
        setConnectionId(result.connectionId);

        if (callback) {
          await callback.open(result.authorizeUrl);
        } else {
          openWeb(result.authorizeUrl);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setStage('error');
          setErrorMessage(getErrorMessage(error));
        }
      }
    },

    submitMappings(mappings: NotionFieldMapping[]) {
      const currentConnectionId = activeConnectionRef.current;
      if (!currentConnectionId) {
        return Promise.resolve();
      }
      setMappingRequests([]);
      return resume(currentConnectionId, mappings);
    },
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof NotionImportApiError && error.reason === 'reauthorize') {
    return 'Notion 연결이 만료되었어요. 다시 연결해 주세요.';
  }

  if (
    error instanceof NotionImportApiError &&
    error.reason === 'permission-denied'
  ) {
    return '로그인 정보를 확인하지 못했어요. 다시 로그인한 뒤 시도해 주세요.';
  }

  return 'Notion 내용을 가져오지 못했어요. 입력은 유지되니 다시 시도해 주세요.';
}

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, milliseconds);
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException('작업이 취소되었습니다.', 'AbortError'));
      },
      { once: true }
    );
  });
}
