import { createHash } from 'node:crypto';

import type { EvaluationInsight, EvaluationQuery } from './contracts';
import { stableStringify } from './experiment_manifest';

export const GEMINI_PROJECTION_CONTRACT = {
  schemaVersion: 2,
  provider: 'gemini-embedding-2',
  outputDimensionality: 768,
  document: {
    sourceFields: ['title', 'memo', 'domain'],
    excludedSourceFields: ['id', 'category', 'originalUrl', 'createdAt'],
    template: 'title: {title} | text: 메모: {memo} | 도메인: {domain}',
  },
  query: {
    sourceFields: ['text'],
    excludedSourceFields: ['id', 'slice', 'phase', 'relevanceByInsightId'],
    template: 'task: search result | query: {text}',
  },
} as const;

export const GEMINI_PROJECTION_HASH = createHash('sha256')
  .update(stableStringify(GEMINI_PROJECTION_CONTRACT))
  .digest('hex');

export function createGeminiDocumentProjection(
  insight: EvaluationInsight
): string {
  return [
    `title: ${insight.title}`,
    `text: 메모: ${insight.memo ?? ''}`,
    `도메인: ${insight.domain}`,
  ].join(' | ');
}

export function createGeminiQueryProjection(query: EvaluationQuery): string {
  return `task: search result | query: ${query.text}`;
}
