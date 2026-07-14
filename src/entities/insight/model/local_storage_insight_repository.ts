import type {
  InsightRepository,
  InsightRepositoryWarning,
} from './insight_repository';
import { parseInsight } from './parse_insight';

const INSIGHT_STORAGE_KEY = 'amajda:insights';
const INSIGHT_SCHEMA_VERSION = 1;

export function createLocalStorageInsightRepository(
  storage: Storage
): InsightRepository {
  return {
    load() {
      let serializedStore: string | null;

      try {
        serializedStore = storage.getItem(INSIGHT_STORAGE_KEY);
      } catch {
        return { insights: [], warnings: ['read-failed'] };
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

      if (parsedStore.schemaVersion !== INSIGHT_SCHEMA_VERSION) {
        return { insights: [], warnings: ['corrupted-store'] };
      }

      if (!Array.isArray(parsedStore.insights)) {
        return { insights: [], warnings: ['corrupted-store'] };
      }

      const insights = parsedStore.insights
        .map(parseInsight)
        .filter((insight) => insight !== null);
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
          JSON.stringify({ schemaVersion: INSIGHT_SCHEMA_VERSION, insights })
        );
      } catch {
        return { ok: false, reason: 'write-failed' };
      }

      return { ok: true };
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
