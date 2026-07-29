export const RETRIEVE_EMBEDDING_MODEL = 'gemini-embedding-2';
export const RETRIEVE_EMBEDDING_DIMENSIONS = 768;
export const RETRIEVE_PROJECTION_VERSION = 1;
export const RETRIEVE_SIMILARITY_THRESHOLD = 0.59;
export const RETRIEVE_INDEX_CATCH_UP_LIMIT = 8;
export const RETRIEVE_INDEX_CONCURRENCY = 4;
export const RETRIEVE_MONTHLY_TOKEN_LIMIT = 25_000_000;
export const RETRIEVE_MAX_TOKENS_PER_EMBEDDING = 8_192;

type DocumentSource = {
  category?: string | null;
  memo: string | null;
  title: string;
};

export function createDocumentEmbeddingText(source: DocumentSource) {
  const title = source.title.trim();
  const text = source.memo?.trim() || title;

  return `title: ${title} | text: ${text}`;
}

export function createQueryEmbeddingText(query: string) {
  return `task: search result | query: ${query.trim()}`;
}

export function isEmbeddingVector(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === RETRIEVE_EMBEDDING_DIMENSIONS &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  );
}
