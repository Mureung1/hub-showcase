import type {
  InsightRepository,
  InsightRepositoryLoadResult,
  InsightRepositoryWarning,
} from './insight_repository';
import type { Insight } from './insight';
import { parseInsight } from './parse_insight';

const INSIGHT_STORAGE_KEY = 'amajda:insights';
const INSIGHT_SCHEMA_VERSION = 1;

export function createLocalStorageInsightRepository(
  storage: Storage
): InsightRepository {
  return {
    async list() {
      return readInsights(storage);
    },
    async create(insight) {
      const loadResult = readInsights(storage);

      if (loadResult.warnings.includes('read-failed')) {
        return { ok: false, reason: 'write-failed' };
      }

      if (
        loadResult.insights.some(
          (candidate) => candidate.normalizedUrl === insight.normalizedUrl
        )
      ) {
        return { ok: false, reason: 'duplicate' };
      }

      const writeResult = writeInsights(storage, [
        insight,
        ...loadResult.insights,
      ]);

      return writeResult.ok
        ? { insight, ok: true }
        : { ok: false, reason: 'write-failed' };
    },
    async update(insight) {
      const loadResult = readInsights(storage);
      const insightIndex = loadResult.insights.findIndex(
        (candidate) => candidate.id === insight.id
      );

      if (loadResult.warnings.includes('read-failed')) {
        return { ok: false, reason: 'write-failed' };
      }

      if (insightIndex === -1) {
        return { ok: false, reason: 'not-found' };
      }

      if (
        loadResult.insights.some(
          (candidate) =>
            candidate.id !== insight.id &&
            candidate.normalizedUrl === insight.normalizedUrl
        )
      ) {
        return { ok: false, reason: 'duplicate' };
      }

      const nextInsights = [...loadResult.insights];
      nextInsights[insightIndex] = insight;
      const writeResult = writeInsights(storage, nextInsights);

      return writeResult.ok
        ? { insight, ok: true }
        : { ok: false, reason: 'write-failed' };
    },
    async delete(insightId) {
      const loadResult = readInsights(storage);
      const insightIndex = loadResult.insights.findIndex(
        (candidate) => candidate.id === insightId
      );

      if (loadResult.warnings.includes('read-failed')) {
        return { ok: false, reason: 'write-failed' };
      }

      if (insightIndex === -1) {
        return { ok: false, reason: 'not-found' };
      }

      const nextInsights = [...loadResult.insights];
      nextInsights.splice(insightIndex, 1);

      return writeInsights(storage, nextInsights);
    },
    async deleteMany(insightIds) {
      const loadResult = readInsights(storage);
      const uniqueInsightIds = [...new Set(insightIds)];

      if (loadResult.warnings.includes('read-failed')) {
        return { ok: false, reason: 'write-failed' };
      }

      if (uniqueInsightIds.length === 0) {
        return { ok: false, reason: 'invalid-request' };
      }

      const insightIdSet = new Set(loadResult.insights.map(({ id }) => id));

      if (uniqueInsightIds.some((id) => !insightIdSet.has(id))) {
        return { ok: false, reason: 'not-found' };
      }

      const deleteIdSet = new Set(uniqueInsightIds);
      const writeResult = writeInsights(
        storage,
        loadResult.insights.filter(({ id }) => !deleteIdSet.has(id))
      );

      return writeResult.ok
        ? { deletedIds: uniqueInsightIds, ok: true }
        : { ok: false, reason: 'write-failed' };
    },
  };
}

function readInsights(storage: Storage): InsightRepositoryLoadResult {
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

  if (
    !isRecord(parsedStore) ||
    parsedStore.schemaVersion !== INSIGHT_SCHEMA_VERSION ||
    !Array.isArray(parsedStore.insights)
  ) {
    return { insights: [], warnings: ['corrupted-store'] };
  }

  const insights: Insight[] = [];
  const seenInsightIds = new Set<string>();
  let hasCorruptedEntry = false;

  for (const storedInsight of parsedStore.insights) {
    const parsedInsight = parseInsight(storedInsight);

    if (parsedInsight === null || seenInsightIds.has(parsedInsight.id)) {
      hasCorruptedEntry = true;
      continue;
    }

    seenInsightIds.add(parsedInsight.id);
    insights.push(parsedInsight);
  }

  const warnings: InsightRepositoryWarning[] = hasCorruptedEntry
    ? ['corrupted-entry']
    : [];

  return { insights, warnings };
}

function writeInsights(storage: Storage, insights: Insight[]) {
  try {
    storage.setItem(
      INSIGHT_STORAGE_KEY,
      JSON.stringify({ schemaVersion: INSIGHT_SCHEMA_VERSION, insights })
    );
  } catch {
    return { ok: false, reason: 'write-failed' } as const;
  }

  return { ok: true } as const;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
