import { Button } from '@/shared/ui';

export type InsightImportSource = 'file' | 'notion' | 'paste';

export const INSIGHT_IMPORT_SOURCE_LABELS = {
  file: '파일에서 가져오기',
  notion: 'Notion에서 가져오기',
  paste: '링크 붙여넣기',
} as const satisfies Record<InsightImportSource, string>;

const SOURCE_OPTIONS = [
  { label: '파일', value: 'file' },
  { label: 'Notion', value: 'notion' },
  { label: '링크', value: 'paste' },
] as const satisfies readonly {
  label: string;
  value: InsightImportSource;
}[];

export type InsightImportSourceSelectorProps = {
  disabled: boolean;
  onSelect: (source: InsightImportSource) => void;
  selected: InsightImportSource | null;
};

export function InsightImportSourceSelector({
  disabled,
  onSelect,
  selected,
}: InsightImportSourceSelectorProps) {
  return (
    <div
      aria-label="가져올 위치"
      className="insight-import-dialog__source-navigation"
      role="group"
    >
      <span className="insight-import-dialog__source-navigation-label">
        가져올 위치
      </span>
      {SOURCE_OPTIONS.map(({ label, value }) => (
        <Button
          aria-pressed={selected === value}
          className="insight-import-dialog__source-option"
          disabled={disabled}
          hierarchy="ghost"
          key={value}
          onClick={() => onSelect(value)}
          type="button"
        >
          <span aria-hidden="true">{label}</span>
          <span className="visually-hidden">
            {INSIGHT_IMPORT_SOURCE_LABELS[value]}
          </span>
        </Button>
      ))}
    </div>
  );
}
