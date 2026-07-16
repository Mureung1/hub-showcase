export const INSIGHT_CAPTURE_SOURCES = [
  'web',
  'chrome_extension',
  'ios_share',
  'android_share',
] as const;

export type InsightCaptureSource = (typeof INSIGHT_CAPTURE_SOURCES)[number];

export type InsightTitleOrigin = 'capture' | 'fallback' | 'metadata' | 'user';

export type InsightCaptureRequest = {
  source: InsightCaptureSource;
  title?: string;
  url: string;
};

export type CapturedInsight = {
  category: string | null;
  createdAt: string;
  domain: string;
  id: string;
  memo: string | null;
  normalizedUrl: string;
  originalUrl: string;
  title: string;
  titleOrigin: InsightTitleOrigin;
  updatedAt: string;
};

export type InsightCaptureFailureReason =
  | 'invalid-request'
  | 'invalid-url'
  | 'permission-denied'
  | 'unsupported-protocol'
  | 'write-failed';

export type InsightCaptureResult =
  | { created: boolean; insight: CapturedInsight; ok: true }
  | { ok: false; reason: InsightCaptureFailureReason };

export type InsightCaptureService = {
  capture(request: InsightCaptureRequest): Promise<InsightCaptureResult>;
};

export function isInsightCaptureSource(
  value: unknown
): value is InsightCaptureSource {
  return (
    typeof value === 'string' &&
    INSIGHT_CAPTURE_SOURCES.some((source) => source === value)
  );
}
