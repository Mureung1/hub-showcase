import type { Insight } from './insight';
import type {
  InsightRepository,
  InsightRepositoryWarning,
} from './insight_repository';

const INSIGHT_STORAGE_KEY = 'amajda:insights';
const REQUIRED_STRING_FIELDS = [
  'id',
  'originalUrl',
  'normalizedUrl',
  'domain',
  'title',
  'createdAt',
  'updatedAt',
] as const;

export function createLocalStorageInsightRepository(
  storage: Storage
): InsightRepository {
  return {
    load() {
      let serializedStore: string | null;

      try {
        serializedStore = storage.getItem(INSIGHT_STORAGE_KEY);
      } catch {
        return { insights: [], warnings: ['corrupted-store'] };
      }

      if (serializedStore === null) {
        return { insights: [], warnings: [] };
      }

      let parsedStore: unknown;

      try {
        parsedStore = JSON.parse(serializedStore);
      } catch {
        return { insights: [], warnings: ['corrupted-store'] };
      }

      if (!isRecord(parsedStore)) {
        return { insights: [], warnings: ['corrupted-store'] };
      }

      if (parsedStore.schemaVersion !== 1) {
        return { insights: [], warnings: ['corrupted-store'] };
      }

      if (!Array.isArray(parsedStore.insights)) {
        return { insights: [], warnings: ['corrupted-store'] };
      }

      const insights = parsedStore.insights.filter(isInsight);
      const warnings: InsightRepositoryWarning[] =
        insights.length === parsedStore.insights.length
          ? []
          : ['corrupted-entry'];

      return { insights, warnings };
    },
    save(insights) {
      try {
        storage.setItem(
          INSIGHT_STORAGE_KEY,
          JSON.stringify({ schemaVersion: 1, insights })
        );
      } catch {
        return { ok: false, reason: 'write-failed' };
      }

      return { ok: true };
    },
  };
}

function isInsight(value: unknown): value is Insight {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<Record<keyof Insight, unknown>>;

  return (
    REQUIRED_STRING_FIELDS.every(
      (field) => typeof candidate[field] === 'string'
    ) &&
    isNullableString(candidate.memo) &&
    isNullableString(candidate.category)
  );
}

function isNullableString(value: unknown) {
  return value === null || typeof value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
