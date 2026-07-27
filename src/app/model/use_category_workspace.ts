import { useCallback, useEffect, useRef, useState } from 'react';

import {
  normalizeCategoryInput,
  normalizeCategoryName,
  type Category,
  type CategoryInput,
  type CategoryRepository,
  type CategoryRepositoryDeleteResult,
  type CategoryRepositoryLoadResult,
  type CategoryRepositoryWriteResult,
  type CategoryRepositoryWarning,
} from '@/entities/category';

export type UseCategoryWorkspaceOptions = {
  onCategoryDeleted: (categoryId: string) => void;
  repository: CategoryRepository;
};

type CategoryWorkspaceState = {
  categories: Category[];
  loadWarnings: CategoryRepositoryWarning[];
  repository: CategoryRepository;
  status: 'loading' | 'ready';
};

export function useCategoryWorkspace({
  onCategoryDeleted,
  repository,
}: UseCategoryWorkspaceOptions) {
  const [workspaceState, setWorkspaceState] = useState<CategoryWorkspaceState>(
    () => createLoadingState(repository)
  );
  const [isMutating, setIsMutating] = useState(false);
  const workspaceStateRef = useRef(workspaceState);
  const mutationInFlightRef = useRef(false);
  const loadRevisionRef = useRef(0);
  const mountedRef = useRef(false);

  const reloadCategories = useCallback(async () => {
    const revision = ++loadRevisionRef.current;
    const currentState = workspaceStateRef.current;
    const loadingState =
      currentState.repository === repository
        ? { ...currentState, status: 'loading' as const }
        : createLoadingState(repository);

    workspaceStateRef.current = loadingState;
    setWorkspaceState(loadingState);

    const loadResult = await loadCategories(repository);

    if (!mountedRef.current || loadRevisionRef.current !== revision) {
      return;
    }

    const readyState: CategoryWorkspaceState = {
      categories: loadResult.categories,
      loadWarnings: loadResult.warnings,
      repository,
      status: 'ready',
    };
    workspaceStateRef.current = readyState;
    setWorkspaceState(readyState);
  }, [repository]);

  useEffect(() => {
    mountedRef.current = true;
    void reloadCategories();

    return () => {
      mountedRef.current = false;
      loadRevisionRef.current += 1;
    };
  }, [reloadCategories]);

  const runMutation = useCallback(
    async <T>(command: () => Promise<T>, failure: T): Promise<T> => {
      const currentState = workspaceStateRef.current;

      if (
        currentState.repository !== repository ||
        currentState.status !== 'ready' ||
        mutationInFlightRef.current
      ) {
        return failure;
      }

      mutationInFlightRef.current = true;
      setIsMutating(true);

      try {
        return await command();
      } finally {
        mutationInFlightRef.current = false;
        setIsMutating(false);
      }
    },
    [repository]
  );

  const createCategory = useCallback(
    async (input: CategoryInput): Promise<CategoryRepositoryWriteResult> =>
      runMutation<CategoryRepositoryWriteResult>(
        async () => {
          const currentState = workspaceStateRef.current;
          const normalizedInput = normalizeCategoryInput(input);

          if (!normalizedInput) {
            return { ok: false, reason: 'invalid-input' };
          }

          if (hasDuplicateName(currentState.categories, normalizedInput.name)) {
            return { ok: false, reason: 'duplicate' };
          }

          const sortOrder =
            Math.max(
              -1,
              ...currentState.categories.map((category) => category.sortOrder)
            ) + 1;
          const createResult = await repository.create(
            normalizedInput,
            sortOrder
          );

          if (!createResult.ok) {
            return createResult;
          }

          updateReadyState(repository, setWorkspaceState, workspaceStateRef, {
            categories: [...currentState.categories, createResult.category],
            loadWarnings: currentState.loadWarnings,
          });

          return createResult;
        },
        { ok: false, reason: 'write-failed' }
      ),
    [repository, runMutation]
  );

  const updateCategory = useCallback(
    async (
      categoryId: string,
      input: CategoryInput
    ): Promise<CategoryRepositoryWriteResult> =>
      runMutation<CategoryRepositoryWriteResult>(
        async () => {
          const currentState = workspaceStateRef.current;
          const categoryIndex = currentState.categories.findIndex(
            (category) => category.id === categoryId
          );

          if (categoryIndex === -1) {
            return { ok: false, reason: 'not-found' };
          }

          const normalizedInput = normalizeCategoryInput(input);

          if (!normalizedInput) {
            return { ok: false, reason: 'invalid-input' };
          }

          if (
            hasDuplicateName(
              currentState.categories,
              normalizedInput.name,
              categoryId
            )
          ) {
            return { ok: false, reason: 'duplicate' };
          }

          const updateResult = await repository.update(
            categoryId,
            normalizedInput
          );

          if (!updateResult.ok) {
            return updateResult;
          }

          const nextCategories = [...currentState.categories];
          nextCategories[categoryIndex] = updateResult.category;
          updateReadyState(repository, setWorkspaceState, workspaceStateRef, {
            categories: nextCategories,
            loadWarnings: currentState.loadWarnings,
          });

          return updateResult;
        },
        { ok: false, reason: 'write-failed' }
      ),
    [repository, runMutation]
  );

  const deleteCategory = useCallback(
    async (categoryId: string): Promise<CategoryRepositoryDeleteResult> =>
      runMutation<CategoryRepositoryDeleteResult>(
        async () => {
          const currentState = workspaceStateRef.current;
          const categoryIndex = currentState.categories.findIndex(
            (category) => category.id === categoryId
          );

          if (categoryIndex === -1) {
            return { ok: false, reason: 'not-found' };
          }

          const deleteResult = await repository.delete(categoryId);

          if (!deleteResult.ok) {
            return deleteResult;
          }

          const nextCategories = [...currentState.categories];
          nextCategories.splice(categoryIndex, 1);
          updateReadyState(repository, setWorkspaceState, workspaceStateRef, {
            categories: nextCategories,
            loadWarnings: currentState.loadWarnings,
          });
          onCategoryDeleted(categoryId);

          return deleteResult;
        },
        { ok: false, reason: 'write-failed' }
      ),
    [onCategoryDeleted, repository, runMutation]
  );

  const isCurrentRepository = workspaceState.repository === repository;

  return {
    categories: isCurrentRepository ? workspaceState.categories : [],
    createCategory,
    deleteCategory,
    isLoading: !isCurrentRepository || workspaceState.status === 'loading',
    isMutating,
    loadWarnings: isCurrentRepository ? workspaceState.loadWarnings : [],
    reloadCategories,
    updateCategory,
  };
}

async function loadCategories(
  repository: CategoryRepository
): Promise<CategoryRepositoryLoadResult> {
  try {
    return await repository.list();
  } catch {
    return { categories: [], warnings: ['read-failed'] };
  }
}

function createLoadingState(
  repository: CategoryRepository
): CategoryWorkspaceState {
  return {
    categories: [],
    loadWarnings: [],
    repository,
    status: 'loading',
  };
}

function updateReadyState(
  repository: CategoryRepository,
  setWorkspaceState: React.Dispatch<
    React.SetStateAction<CategoryWorkspaceState>
  >,
  workspaceStateRef: React.MutableRefObject<CategoryWorkspaceState>,
  values: Pick<CategoryWorkspaceState, 'categories' | 'loadWarnings'>
) {
  if (workspaceStateRef.current.repository !== repository) {
    return;
  }

  const nextState: CategoryWorkspaceState = {
    ...workspaceStateRef.current,
    ...values,
    status: 'ready',
  };
  workspaceStateRef.current = nextState;
  setWorkspaceState(nextState);
}

function hasDuplicateName(
  categories: Category[],
  name: string,
  excludedCategoryId?: string
) {
  const normalizedName = toDuplicateKey(name);

  return categories.some(
    (category) =>
      category.id !== excludedCategoryId &&
      toDuplicateKey(category.name) === normalizedName
  );
}

function toDuplicateKey(name: string) {
  return normalizeCategoryName(name).toLocaleLowerCase('ko-KR');
}
