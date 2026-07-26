import { useId } from 'react';

import { normalizeCategoryInput, type Category } from '@/entities/category';
import {
  CATEGORY_COLOR_KEYS,
  categoryPalette,
  type CategoryColorKey,
} from '@/shared/config/design-system';
import { Select, TextField } from '@/shared/ui';

import type {
  ImportCollectionMapping,
  ImportCollectionTarget,
  PreparedImport,
  PreparedImportItem,
} from '../model/import_types';

export type ImportPreviewProps = {
  categories: readonly Category[];
  mappings: readonly ImportCollectionMapping[];
  onMappingChange: (mapping: ImportCollectionMapping) => void;
  prepared: PreparedImport;
  showMappings?: boolean;
};

export function ImportPreview({
  categories,
  mappings,
  onMappingChange,
  prepared,
  showMappings = true,
}: ImportPreviewProps) {
  const issueItems = prepared.items.filter(isIssueItem);

  return (
    <div className="insight-import-dialog__preview">
      <ImportSummary prepared={prepared} />

      {issueItems.length > 0 ? <ImportIssueDetails items={issueItems} /> : null}

      {showMappings && prepared.collections.length > 0 ? (
        <section
          aria-labelledby="insight-import-collections-title"
          className="insight-import-dialog__collections"
        >
          <h3 id="insight-import-collections-title">분류 연결</h3>
          <p>가져온 모음을 기존 분류나 새 분류에 연결할 수 있습니다.</p>
          {prepared.collections.map((collectionPath) => {
            const collectionKey = JSON.stringify(collectionPath);
            const mapping = mappings.find(
              (currentMapping) => currentMapping.collectionKey === collectionKey
            ) ?? {
              collectionKey,
              target: { kind: 'uncategorized' as const },
            };

            return (
              <CollectionMappingField
                categories={categories}
                collectionLabel={collectionPath.join(' / ')}
                key={collectionKey}
                mapping={mapping}
                onChange={onMappingChange}
              />
            );
          })}
        </section>
      ) : null}
    </div>
  );
}

function ImportSummary({ prepared }: { prepared: PreparedImport }) {
  const { summary } = prepared;

  return (
    <dl
      aria-label="가져오기 분석 요약"
      className="insight-import-dialog__summary"
    >
      <SummaryItem label="신규" value={summary.newCount} />
      <SummaryItem label="기존 중복" value={summary.duplicateCount} />
      <SummaryItem label="입력 중복" value={summary.inputDuplicateCount} />
      <SummaryItem label="제외" value={summary.excludedCount} />
    </dl>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CollectionMappingField({
  categories,
  collectionLabel,
  mapping,
  onChange,
}: {
  categories: readonly Category[];
  collectionLabel: string;
  mapping: ImportCollectionMapping;
  onChange: (mapping: ImportCollectionMapping) => void;
}) {
  const labelId = useId();
  const nameErrorId = useId();
  const selectedValue = getTargetSelectValue(mapping.target);
  const newTarget = mapping.target.kind === 'new' ? mapping.target : undefined;
  const normalizedNewCategory = newTarget
    ? normalizeCategoryInput(newTarget)
    : null;
  const hasInvalidName = Boolean(newTarget && !normalizedNewCategory);

  function setTarget(target: ImportCollectionTarget) {
    onChange({ collectionKey: mapping.collectionKey, target });
  }

  function selectTarget(value: string) {
    if (value === 'uncategorized') {
      setTarget({ kind: 'uncategorized' });
      return;
    }

    if (value === 'new') {
      setTarget({ colorKey: 'slate-2', kind: 'new', name: '' });
      return;
    }

    if (value.startsWith('existing:')) {
      setTarget({
        categoryId: value.slice('existing:'.length),
        kind: 'existing',
      });
    }
  }

  function updateNewTarget(
    nextValue: Partial<{ colorKey: CategoryColorKey; name: string }>
  ) {
    if (!newTarget) {
      return;
    }

    setTarget({ ...newTarget, ...nextValue });
  }

  return (
    <fieldset className="insight-import-dialog__collection">
      <legend id={labelId}>{collectionLabel}</legend>
      <Select
        aria-label={`${collectionLabel} 분류`}
        onValueChange={selectTarget}
        options={[
          { label: '미분류', value: 'uncategorized' },
          ...categories.map((category) => ({
            label: `기존 분류: ${category.name}`,
            value: `existing:${category.id}`,
          })),
          { label: '새 분류', value: 'new' },
        ]}
        value={selectedValue}
      />

      {newTarget ? (
        <div className="insight-import-dialog__new-category">
          <label>
            <span>{collectionLabel} 새 분류 이름</span>
            <TextField
              aria-describedby={hasInvalidName ? nameErrorId : undefined}
              aria-invalid={hasInvalidName}
              aria-label={`${collectionLabel} 새 분류 이름`}
              onChange={(event) =>
                updateNewTarget({ name: event.currentTarget.value })
              }
              value={newTarget.name}
            />
          </label>
          {hasInvalidName ? (
            <p className="insight-import-dialog__field-error" id={nameErrorId}>
              분류 이름은 1자 이상 50자 이하로 입력해 주세요.
            </p>
          ) : null}
          <label>
            <span>{collectionLabel} 새 분류 색상</span>
            <Select
              aria-label={`${collectionLabel} 새 분류 색상`}
              onValueChange={(value) =>
                updateNewTarget({ colorKey: value as CategoryColorKey })
              }
              options={CATEGORY_COLOR_KEYS.map((colorKey) => ({
                label: categoryPalette[colorKey].accessibleName,
                value: colorKey,
              }))}
              value={newTarget.colorKey}
            />
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}

export function ImportIssueDetails({
  items,
}: {
  items: readonly PreparedImportItem[];
}) {
  return (
    <details className="insight-import-dialog__issues">
      <summary>제외된 항목 확인</summary>
      <ul>
        {items.slice(0, 50).map((item) => (
          <li key={item.candidateId}>
            <span>{item.sourceLocation}</span>
            <span>{item.exclusionCode ?? item.classification}</span>
          </li>
        ))}
      </ul>
      {items.length > 50 ? <p>처음 50개 항목만 표시합니다.</p> : null}
    </details>
  );
}

function getTargetSelectValue(target: ImportCollectionTarget) {
  if (target.kind === 'existing') {
    return `existing:${target.categoryId}`;
  }

  return target.kind;
}

function isIssueItem(item: PreparedImportItem) {
  return (
    item.classification === 'excluded' ||
    item.classification === 'input_duplicate'
  );
}
