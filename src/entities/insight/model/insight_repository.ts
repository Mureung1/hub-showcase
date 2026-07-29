import type { Insight } from './insight';

export type InsightRepositoryWarning =
  'corrupted-entry' | 'corrupted-store' | 'permission-denied' | 'read-failed';

export type InsightRepositoryLoadResult = {
  insights: Insight[];
  warnings: InsightRepositoryWarning[];
};

export type InsightRepositoryWriteFailureReason =
  'duplicate' | 'not-found' | 'permission-denied' | 'write-failed';

export type InsightRepositoryWriteResult =
  | { ok: true; insight: Insight }
  | { ok: false; reason: InsightRepositoryWriteFailureReason };

export type InsightRepositoryDeleteResult =
  | { ok: true }
  | {
      ok: false;
      reason: Exclude<InsightRepositoryWriteFailureReason, 'duplicate'>;
    };

export type InsightRepositoryDeleteManyResult =
  | { deletedIds: string[]; ok: true }
  | {
      ok: false;
      reason:
        | 'invalid-request'
        | Exclude<InsightRepositoryWriteFailureReason, 'duplicate'>;
    };

export type InsightRepository = {
  create(insight: Insight): Promise<InsightRepositoryWriteResult>;
  delete(insightId: string): Promise<InsightRepositoryDeleteResult>;
  deleteMany(
    insightIds: readonly string[]
  ): Promise<InsightRepositoryDeleteManyResult>;
  list(): Promise<InsightRepositoryLoadResult>;
  update(insight: Insight): Promise<InsightRepositoryWriteResult>;
};
