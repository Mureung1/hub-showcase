import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';

import type {
  Category,
  CategoryInput,
  CategoryRepositoryDeleteResult,
  CategoryRepositoryFailureReason,
  CategoryRepositoryWriteResult,
} from '@/entities/category';
import {
  CATEGORY_COLOR_KEYS,
  categoryPalette,
  type CategoryColorKey,
} from '@/shared/config/design-system';
import { Button, Modal, TextField } from '@/shared/ui';

import './category_manager.css';

type CategoryManagerMode =
  | { type: 'create' }
  | { categoryId: string; type: 'delete' | 'edit' }
  | { type: 'list' };

export type CategoryManagerProps = {
  categories: readonly Category[];
  createCategory: (
    input: CategoryInput
  ) => Promise<CategoryRepositoryWriteResult>;
  deleteCategory: (
    categoryId: string
  ) => Promise<CategoryRepositoryDeleteResult>;
  isMutating: boolean;
  onCategoryCreated: (category: Category) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  updateCategory: (
    categoryId: string,
    input: CategoryInput
  ) => Promise<CategoryRepositoryWriteResult>;
};

export function CategoryManager({
  categories,
  createCategory,
  deleteCategory,
  isMutating,
  onCategoryCreated,
  onOpenChange,
  open,
  updateCategory,
}: CategoryManagerProps) {
  const nameInputId = useId();
  const nameErrorId = useId();
  const [mode, setMode] = useState<CategoryManagerMode>({ type: 'list' });
  const [name, setName] = useState('');
  const [colorKey, setColorKey] = useState<CategoryColorKey>('slate-2');
  const [failureReason, setFailureReason] =
    useState<CategoryRepositoryFailureReason>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedCategory =
    mode.type === 'edit' || mode.type === 'delete'
      ? categories.find((category) => category.id === mode.categoryId)
      : undefined;

  useEffect(() => {
    if (!open) {
      resetToList();
    }
  }, [open]);

  function resetToList() {
    setMode({ type: 'list' });
    setName('');
    setColorKey('slate-2');
    setFailureReason(undefined);
    setIsSubmitting(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetToList();
    }

    onOpenChange(nextOpen);
  }

  function openCreate() {
    setName('');
    setColorKey('slate-2');
    setFailureReason(undefined);
    setMode({ type: 'create' });
  }

  function openEdit(category: Category) {
    setName(category.name);
    setColorKey(category.colorKey);
    setFailureReason(undefined);
    setMode({ categoryId: category.id, type: 'edit' });
  }

  function openDelete() {
    if (mode.type !== 'edit') {
      return;
    }

    setFailureReason(undefined);
    setMode({ categoryId: mode.categoryId, type: 'delete' });
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode.type !== 'create' && mode.type !== 'edit') {
      return;
    }

    setFailureReason(undefined);
    setIsSubmitting(true);

    const input = { colorKey, name };
    try {
      const result =
        mode.type === 'create'
          ? await createCategory(input)
          : await updateCategory(mode.categoryId, input);

      if (!result.ok) {
        setFailureReason(result.reason);
        return;
      }

      if (mode.type === 'create') {
        onCategoryCreated(result.category);
      }

      resetToList();
    } catch {
      setFailureReason('write-failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (mode.type !== 'delete') {
      return;
    }

    setFailureReason(undefined);
    setIsSubmitting(true);
    try {
      const result = await deleteCategory(mode.categoryId);

      if (!result.ok) {
        setFailureReason(result.reason);
        return;
      }

      resetToList();
    } catch {
      setFailureReason('write-failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  const busy = isMutating || isSubmitting;
  const hasNameError =
    failureReason === 'duplicate' || failureReason === 'invalid-input';

  return (
    <Modal
      description={getDescription(mode)}
      footer={getFooter()}
      onOpenChange={handleOpenChange}
      open={open}
      size="small"
      title={getTitle(mode)}
    >
      {mode.type === 'list' ? renderCategoryList() : null}
      {mode.type === 'create' || mode.type === 'edit'
        ? renderCategoryEditor()
        : null}
      {mode.type === 'delete' ? renderDeleteConfirmation() : null}
    </Modal>
  );

  function renderCategoryList() {
    return (
      <div className="category-manager__list-view">
        {categories.length > 0 ? (
          <ul className="category-manager__list">
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  aria-label={`${category.name} 수정`}
                  className="category-manager__category"
                  disabled={busy}
                  onClick={() => openEdit(category)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="category-manager__category-mark"
                    style={getColorStyle(category.colorKey)}
                  />
                  <span>{category.name}</span>
                  <span
                    aria-hidden="true"
                    className="category-manager__category-action"
                  >
                    수정
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="category-manager__empty">
            아직 만든 카테고리가 없습니다.
          </p>
        )}
        <Button
          disabled={busy}
          fullWidth
          hierarchy="secondary"
          onClick={openCreate}
          type="button"
        >
          새 카테고리
        </Button>
      </div>
    );
  }

  function renderCategoryEditor() {
    return (
      <form
        className="category-manager__editor"
        id="category-manager-form"
        onSubmit={submitCategory}
      >
        <div className="category-manager__field">
          <label htmlFor={nameInputId}>카테고리 이름</label>
          <TextField
            aria-describedby={hasNameError ? nameErrorId : undefined}
            aria-invalid={hasNameError || undefined}
            disabled={busy}
            id={nameInputId}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="예: 사이드 프로젝트"
            value={name}
          />
        </div>
        <fieldset className="category-manager__palette">
          <legend>색상</legend>
          <div className="category-manager__color-grid">
            {CATEGORY_COLOR_KEYS.map((optionColorKey) => {
              const palette = categoryPalette[optionColorKey];
              const selected = optionColorKey === colorKey;

              return (
                <button
                  aria-label={palette.accessibleName}
                  aria-pressed={selected}
                  className="category-manager__color"
                  disabled={busy}
                  key={optionColorKey}
                  onClick={() => setColorKey(optionColorKey)}
                  style={getColorStyle(optionColorKey)}
                  type="button"
                >
                  <span aria-hidden="true">{selected ? '✓' : ''}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        {failureReason ? (
          <p
            className="category-manager__error"
            id={hasNameError ? nameErrorId : undefined}
            role="alert"
          >
            {FAILURE_MESSAGES[failureReason]}
          </p>
        ) : null}
        {mode.type === 'edit' ? (
          <Button
            className="category-manager__delete-entry"
            disabled={busy}
            hierarchy="ghost"
            onClick={openDelete}
            type="button"
          >
            카테고리 삭제
          </Button>
        ) : null}
      </form>
    );
  }

  function renderDeleteConfirmation() {
    return (
      <div className="category-manager__delete-confirmation">
        <p>
          <strong>{selectedCategory?.name ?? '이 카테고리'}</strong>을(를)
          삭제하시겠습니까?
        </p>
        <p>연결된 인사이트는 삭제되지 않고 미분류로 이동합니다.</p>
        {failureReason ? (
          <p className="category-manager__error" role="alert">
            {FAILURE_MESSAGES[failureReason]}
          </p>
        ) : null}
      </div>
    );
  }

  function getFooter() {
    if (mode.type === 'list') {
      return (
        <Button
          disabled={busy}
          hierarchy="secondary"
          onClick={() => handleOpenChange(false)}
          type="button"
        >
          닫기
        </Button>
      );
    }

    if (mode.type === 'delete') {
      return (
        <>
          <Button
            disabled={busy}
            hierarchy="secondary"
            onClick={() =>
              setMode({ categoryId: mode.categoryId, type: 'edit' })
            }
            type="button"
          >
            취소
          </Button>
          <Button
            className="category-manager__danger"
            disabled={busy}
            hierarchy="primary"
            loading={busy}
            onClick={confirmDelete}
            type="button"
          >
            삭제하기
          </Button>
        </>
      );
    }

    return (
      <>
        <Button
          disabled={busy}
          hierarchy="secondary"
          onClick={resetToList}
          type="button"
        >
          취소
        </Button>
        <Button
          disabled={busy}
          form="category-manager-form"
          hierarchy="primary"
          loading={busy}
          type="submit"
        >
          {mode.type === 'create' ? '만들기' : '변경 저장'}
        </Button>
      </>
    );
  }
}

const FAILURE_MESSAGES: Record<CategoryRepositoryFailureReason, string> = {
  duplicate: '같은 이름의 카테고리가 있습니다.',
  'invalid-input': '이름은 1자 이상 50자 이하로 입력해 주세요.',
  'not-found': '카테고리를 찾지 못했습니다. 목록을 다시 확인해 주세요.',
  'permission-denied': '카테고리를 변경할 권한이 없습니다.',
  'write-failed': '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

function getTitle(mode: CategoryManagerMode) {
  switch (mode.type) {
    case 'create':
      return '새 카테고리';
    case 'delete':
      return '카테고리 삭제';
    case 'edit':
      return '카테고리 수정';
    default:
      return '카테고리 관리';
  }
}

function getDescription(mode: CategoryManagerMode) {
  switch (mode.type) {
    case 'create':
      return '이름과 색상을 정해 새 카테고리를 만듭니다.';
    case 'delete':
      return '삭제하기 전에 연결된 인사이트의 이동을 확인해 주세요.';
    case 'edit':
      return '이름이나 색상을 바꾸면 연결된 카드와 필터에도 반영됩니다.';
    default:
      return '카테고리를 만들거나 이름과 색상을 변경할 수 있습니다.';
  }
}

function getColorStyle(colorKey: CategoryColorKey) {
  const palette = categoryPalette[colorKey];

  return {
    '--category-color': palette.cssVariable,
    '--category-foreground':
      palette.foreground === 'canvas'
        ? 'var(--color-canvas)'
        : 'var(--color-ink)',
  } as CSSProperties;
}
