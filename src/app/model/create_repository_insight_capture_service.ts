import {
  normalizeInsightUrl,
  type Insight,
  type InsightCaptureService,
  type InsightRepository,
} from '@/entities/insight';

export function createRepositoryInsightCaptureService(
  repository: InsightRepository
): InsightCaptureService {
  return {
    async capture(request) {
      const normalizedUrl = normalizeInsightUrl(request.url);

      if (!normalizedUrl.ok) {
        return normalizedUrl;
      }

      try {
        const loadResult = await repository.list();

        if (loadResult.warnings.includes('permission-denied')) {
          return { ok: false, reason: 'permission-denied' };
        }

        if (loadResult.warnings.includes('read-failed')) {
          return { ok: false, reason: 'write-failed' };
        }

        const existingInsight = findInsight(
          loadResult.insights,
          normalizedUrl.normalizedUrl
        );

        if (existingInsight) {
          return { created: false, insight: existingInsight, ok: true };
        }

        const timestamp = new Date().toISOString();
        const captureTitle = request.title?.trim();
        const candidate: Insight = {
          categoryId: null,
          createdAt: timestamp,
          domain: normalizedUrl.domain,
          id: crypto.randomUUID(),
          memo: null,
          normalizedUrl: normalizedUrl.normalizedUrl,
          originalUrl: normalizedUrl.originalUrl,
          title: captureTitle || normalizedUrl.domain,
          titleOrigin: captureTitle ? 'capture' : 'fallback',
          updatedAt: timestamp,
        };
        const createResult = await repository.create(candidate);

        if (createResult.ok) {
          return { created: true, insight: createResult.insight, ok: true };
        }

        if (createResult.reason !== 'duplicate') {
          return {
            ok: false,
            reason:
              createResult.reason === 'permission-denied'
                ? 'permission-denied'
                : 'write-failed',
          };
        }

        const refreshedResult = await repository.list();
        const racedInsight = findInsight(
          refreshedResult.insights,
          normalizedUrl.normalizedUrl
        );

        return racedInsight
          ? { created: false, insight: racedInsight, ok: true }
          : { ok: false, reason: 'write-failed' };
      } catch {
        return { ok: false, reason: 'write-failed' };
      }
    },
  };
}

function findInsight(insights: Insight[], normalizedUrl: string) {
  return insights.find((insight) => insight.normalizedUrl === normalizedUrl);
}
