import type { Category, CategoryInput } from './category';

export type CategoryRepositoryWarning =
  'corrupted-entry' | 'permission-denied' | 'read-failed';

export type CategoryRepositoryFailureReason =
  | 'duplicate'
  | 'invalid-input'
  | 'not-found'
  | 'permission-denied'
  | 'write-failed';

export type CategoryRepositoryLoadResult = {
  categories: Category[];
  warnings: CategoryRepositoryWarning[];
};

export type CategoryRepositoryWriteResult =
  | { category: Category; ok: true }
  | { ok: false; reason: CategoryRepositoryFailureReason };

export type CategoryRepositoryDeleteResult =
  | { ok: true }
  | {
      ok: false;
      reason: Exclude<CategoryRepositoryFailureReason, 'duplicate'>;
    };

export type CategoryRepository = {
  create(
    input: CategoryInput,
    sortOrder: number
  ): Promise<CategoryRepositoryWriteResult>;
  delete(categoryId: string): Promise<CategoryRepositoryDeleteResult>;
  list(): Promise<CategoryRepositoryLoadResult>;
  update(
    categoryId: string,
    input: CategoryInput
  ): Promise<CategoryRepositoryWriteResult>;
};
