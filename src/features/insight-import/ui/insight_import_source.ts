export type InsightImportSource = 'file' | 'notion' | 'paste';

export const INSIGHT_IMPORT_SOURCE_LABELS = {
  file: '파일에서 가져오기',
  notion: 'Notion에서 가져오기',
  paste: '링크 붙여넣기',
} as const satisfies Record<InsightImportSource, string>;
