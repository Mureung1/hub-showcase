import type {
  AnalyzedImportItem,
  ImportAdapterKey,
  ImportCollectionMapping,
  ImportCommitResult,
  ImportHistoryEntry,
  ImportInputKind,
  ImportIssuePage,
  ImportUndoResult,
  PreparedImport,
} from './import_types';

export type PrepareImportInput = {
  adapterKey: ImportAdapterKey;
  idempotencyKey: string;
  inputKind: ImportInputKind;
  items: AnalyzedImportItem[];
};

export type ImportServiceFailureReason =
  | 'invalid-request'
  | 'permission-denied'
  | 'read-failed'
  | 'undo-expired'
  | 'write-failed';

export type ImportServiceResult<T> =
  { ok: true; value: T } | { ok: false; reason: ImportServiceFailureReason };

export type InsightImportService = {
  commit(
    jobId: string,
    mappings: ImportCollectionMapping[]
  ): Promise<ImportServiceResult<ImportCommitResult>>;
  deleteRecord(jobId: string): Promise<ImportServiceResult<void>>;
  listHistory(): Promise<ImportServiceResult<ImportHistoryEntry[]>>;
  listIssues(
    jobId: string,
    afterOrdinal: number | null
  ): Promise<ImportServiceResult<ImportIssuePage>>;
  prepare(
    input: PrepareImportInput
  ): Promise<ImportServiceResult<PreparedImport>>;
  retry(
    jobId: string,
    mappings: ImportCollectionMapping[]
  ): Promise<ImportServiceResult<ImportCommitResult>>;
  undo(jobId: string): Promise<ImportServiceResult<ImportUndoResult>>;
};
