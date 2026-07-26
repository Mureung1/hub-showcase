import { Client } from '@notionhq/client';

const NOTION_VERSION = '2026-03-11';
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;

export type NotionClientFailureCode =
  | 'invalid-request'
  | 'reauthorize'
  | 'forbidden'
  | 'not-found'
  | 'provider-failed';

export class NotionClientError extends Error {
  readonly code: NotionClientFailureCode;

  constructor(code: NotionClientFailureCode) {
    super('Notion 요청을 완료하지 못했습니다.');
    this.code = code;
    this.name = 'NotionClientError';
  }
}

export type NotionImportClient = {
  listBlockChildren(blockId: string, cursor: string | null): Promise<unknown>;
  queryDataSource(
    dataSourceId: string,
    cursor: string | null
  ): Promise<unknown>;
  retrieveDataSource(dataSourceId: string): Promise<unknown>;
  retrievePageProperty(
    pageId: string,
    propertyId: string,
    cursor: string | null
  ): Promise<unknown>;
  search(
    object: 'data_source' | 'page' | null,
    cursor: string | null
  ): Promise<unknown>;
};

export type NotionAnalysisCursor = {
  blockQueue: Array<{
    blockId: string;
    collectionPath: string[];
    cursor: string | null;
  }>;
  dataSourceQueue: Array<{
    dataSourceId: string;
    cursor: string | null;
  }>;
  searchCursor: string | null;
  stage: 'search' | 'data-sources' | 'blocks' | 'complete';
  visitedBlockIds: string[];
  visitedDataSourceIds: string[];
  visitedPageIds: string[];
};

export type NotionAnalysisSlice = {
  blocks: Array<{ block: unknown; collectionPath: string[] }>;
  cursor: NotionAnalysisCursor;
  dataSources: unknown[];
  pages: Array<{ collectionPath: string[]; page: unknown }>;
  requestCount: number;
};

export type CreateNotionImportClientOptions = {
  accessToken: string;
  fetch?: typeof globalThis.fetch;
  jitter?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export function createNotionImportClient({
  accessToken,
  fetch = globalThis.fetch,
  jitter = () => Math.random(),
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
}: CreateNotionImportClientOptions): NotionImportClient {
  const retryingFetch: typeof globalThis.fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');
    const requestInit = { ...init, headers };

    for (let attempt = 0; ; attempt += 1) {
      const response = await fetch(input, requestInit);

      if (!RETRYABLE_STATUSES.has(response.status) || attempt >= MAX_RETRIES) {
        return response;
      }

      await sleep(getRetryDelay(response, attempt, jitter));
    }
  };
  const client = new Client({
    auth: accessToken,
    fetch: retryingFetch,
    notionVersion: NOTION_VERSION,
    retry: false,
  });

  return {
    listBlockChildren(blockId, cursor) {
      return safelyRequest(() =>
        client.blocks.children.list({
          block_id: blockId,
          page_size: 100,
          start_cursor: cursor ?? undefined,
        })
      );
    },

    queryDataSource(dataSourceId, cursor) {
      return safelyRequest(() =>
        client.dataSources.query({
          data_source_id: dataSourceId,
          page_size: 100,
          start_cursor: cursor ?? undefined,
        })
      );
    },

    retrieveDataSource(dataSourceId) {
      return safelyRequest(() =>
        client.dataSources.retrieve({ data_source_id: dataSourceId })
      );
    },

    retrievePageProperty(pageId, propertyId, cursor) {
      return safelyRequest(() =>
        client.pages.properties.retrieve({
          page_id: pageId,
          page_size: 100,
          property_id: propertyId,
          start_cursor: cursor ?? undefined,
        })
      );
    },

    search(object, cursor) {
      return safelyRequest(() =>
        client.search({
          filter: object ? { property: 'object', value: object } : undefined,
          page_size: 100,
          start_cursor: cursor ?? undefined,
        })
      );
    },
  };
}

export function createInitialNotionAnalysisCursor(): NotionAnalysisCursor {
  return {
    blockQueue: [],
    dataSourceQueue: [],
    searchCursor: null,
    stage: 'search',
    visitedBlockIds: [],
    visitedDataSourceIds: [],
    visitedPageIds: [],
  };
}

export async function runNotionAnalysisSlice(
  client: NotionImportClient,
  initialCursor: NotionAnalysisCursor,
  {
    maxDurationMs = 8_000,
    maxRequests = 8,
    now = () => Date.now(),
  }: {
    maxDurationMs?: number;
    maxRequests?: number;
    now?: () => number;
  } = {}
): Promise<NotionAnalysisSlice> {
  const cursor = structuredClone(initialCursor);
  const blocks: NotionAnalysisSlice['blocks'] = [];
  const dataSources: unknown[] = [];
  const pages: NotionAnalysisSlice['pages'] = [];
  const startedAt = now();
  let requestCount = 0;

  const request = async (operation: () => Promise<unknown>) => {
    if (requestCount >= maxRequests || now() - startedAt >= maxDurationMs) {
      return { exhausted: true as const, value: undefined };
    }

    const value = await operation();
    requestCount += 1;
    return { exhausted: false as const, value };
  };

  while (cursor.stage !== 'complete') {
    assertCursorLimits(cursor);

    if (cursor.stage === 'search') {
      const response = await request(() =>
        client.search(null, cursor.searchCursor)
      );
      if (response.exhausted) {
        break;
      }

      const page = parseListResponse(response.value);
      for (const item of page.results) {
        if (!isRecord(item) || typeof item.id !== 'string') {
          continue;
        }

        if (item.object === 'data_source') {
          appendUniqueDataSource(cursor, item.id);
        } else if (item.object === 'page') {
          appendPage(cursor, pages, item, []);
        }
      }
      cursor.searchCursor = page.nextCursor;
      if (!page.hasMore) {
        cursor.stage =
          cursor.dataSourceQueue.length > 0
            ? 'data-sources'
            : cursor.blockQueue.length > 0
              ? 'blocks'
              : 'complete';
      }
      continue;
    }

    if (cursor.stage === 'data-sources') {
      const current = cursor.dataSourceQueue[0];
      if (!current) {
        cursor.stage = cursor.blockQueue.length > 0 ? 'blocks' : 'complete';
        continue;
      }

      const schemaResponse = await request(() =>
        client.retrieveDataSource(current.dataSourceId)
      );
      if (schemaResponse.exhausted) {
        break;
      }
      dataSources.push(schemaResponse.value);
      const collectionPath = readObjectTitle(schemaResponse.value);
      const queryResponse = await request(() =>
        client.queryDataSource(current.dataSourceId, current.cursor)
      );
      if (queryResponse.exhausted) {
        break;
      }

      const page = parseListResponse(queryResponse.value);
      for (const item of page.results) {
        if (isRecord(item) && item.object === 'page') {
          appendPage(cursor, pages, item, collectionPath);
        }
      }

      if (page.hasMore) {
        current.cursor = page.nextCursor;
      } else {
        cursor.dataSourceQueue.shift();
        appendUnique(cursor.visitedDataSourceIds, current.dataSourceId);
      }
      continue;
    }

    const current = cursor.blockQueue[0];
    if (!current) {
      cursor.stage = 'complete';
      continue;
    }

    const response = await request(() =>
      client.listBlockChildren(current.blockId, current.cursor)
    );
    if (response.exhausted) {
      break;
    }

    const page = parseListResponse(response.value);
    for (const item of page.results) {
      blocks.push({ block: item, collectionPath: current.collectionPath });

      if (
        isRecord(item) &&
        typeof item.id === 'string' &&
        item.has_children === true
      ) {
        const childPath =
          item.type === 'child_page' || item.type === 'child_data_source'
            ? [
                ...current.collectionPath,
                readChildTitle(item) ?? '제목 없음',
              ].slice(0, 20)
            : current.collectionPath;
        appendUniqueBlock(cursor, item.id, childPath);
      }
    }

    if (page.hasMore) {
      current.cursor = page.nextCursor;
    } else {
      cursor.blockQueue.shift();
      appendUnique(cursor.visitedBlockIds, current.blockId);
    }
  }

  assertCursorLimits(cursor);
  return { blocks, cursor, dataSources, pages, requestCount };
}

async function safelyRequest(operation: () => Promise<unknown>) {
  try {
    return await operation();
  } catch (error) {
    throw new NotionClientError(getFailureCode(error));
  }
}

function getFailureCode(error: unknown): NotionClientFailureCode {
  const status = getErrorStatus(error);

  if (status === 400) {
    return 'invalid-request';
  }

  if (status === 401) {
    return 'reauthorize';
  }

  if (status === 403) {
    return 'forbidden';
  }

  if (status === 404) {
    return 'not-found';
  }

  return 'provider-failed';
}

function getErrorStatus(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status;
  }

  return undefined;
}

function getRetryDelay(
  response: Response,
  attempt: number,
  jitter: () => number
) {
  const retryAfter = response.headers.get('retry-after');

  if (retryAfter && /^\d+$/u.test(retryAfter)) {
    return Number(retryAfter) * 1000;
  }

  const jitterFactor = Math.max(0, Math.min(1, jitter()));
  return BASE_RETRY_DELAY_MS * 2 ** attempt * (1 + jitterFactor * 0.2);
}

function parseListResponse(value: unknown) {
  if (
    !isRecord(value) ||
    !Array.isArray(value.results) ||
    typeof value.has_more !== 'boolean' ||
    !(value.next_cursor === null || typeof value.next_cursor === 'string')
  ) {
    throw new NotionClientError('provider-failed');
  }

  return {
    hasMore: value.has_more,
    nextCursor: value.next_cursor,
    results: value.results,
  };
}

function appendPage(
  cursor: NotionAnalysisCursor,
  pages: NotionAnalysisSlice['pages'],
  page: Record<string, unknown>,
  collectionPath: string[]
) {
  if (typeof page.id !== 'string' || cursor.visitedPageIds.includes(page.id)) {
    return;
  }

  appendUnique(cursor.visitedPageIds, page.id);
  pages.push({ collectionPath, page });
  appendUniqueBlock(cursor, page.id, collectionPath);
}

function appendUniqueDataSource(
  cursor: NotionAnalysisCursor,
  dataSourceId: string
) {
  if (
    cursor.visitedDataSourceIds.includes(dataSourceId) ||
    cursor.dataSourceQueue.some((entry) => entry.dataSourceId === dataSourceId)
  ) {
    return;
  }

  cursor.dataSourceQueue.push({ cursor: null, dataSourceId });
}

function appendUniqueBlock(
  cursor: NotionAnalysisCursor,
  blockId: string,
  collectionPath: string[]
) {
  if (
    cursor.visitedBlockIds.includes(blockId) ||
    cursor.blockQueue.some((entry) => entry.blockId === blockId)
  ) {
    return;
  }

  cursor.blockQueue.push({ blockId, collectionPath, cursor: null });
}

function appendUnique(values: string[], value: string) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function assertCursorLimits(cursor: NotionAnalysisCursor) {
  const collections = [
    cursor.blockQueue,
    cursor.dataSourceQueue,
    cursor.visitedBlockIds,
    cursor.visitedDataSourceIds,
    cursor.visitedPageIds,
  ];

  if (collections.some((collection) => collection.length > 10_000)) {
    throw new NotionClientError('invalid-request');
  }
}

function readObjectTitle(value: unknown) {
  if (!isRecord(value)) {
    return [];
  }

  const title = readRichText(value.title);
  return title ? [title] : [];
}

function readChildTitle(value: Record<string, unknown>) {
  if (typeof value.type !== 'string' || !isRecord(value[value.type])) {
    return null;
  }

  const content = value[value.type] as Record<string, unknown>;
  return typeof content.title === 'string' ? content.title : null;
}

function readRichText(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const text = value
    .map((item) =>
      isRecord(item) && typeof item.plain_text === 'string'
        ? item.plain_text
        : ''
    )
    .join('')
    .trim();
  return text || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
