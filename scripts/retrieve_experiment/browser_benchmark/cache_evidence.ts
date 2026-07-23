export const REQUIRED_MODEL_CACHE_BASENAMES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'model_quantized.onnx',
] as const;

export type SanitizedCacheEntry = Readonly<{
  basename: string;
  hasFixedRevision: boolean;
}>;

export function verifyFixedModelCacheEntries(
  entries: readonly SanitizedCacheEntry[]
): Readonly<{
  cacheHitVerified: boolean;
  missingRequiredBasenames: readonly string[];
}> {
  const matchedBasenames = new Set(
    entries
      .filter(({ hasFixedRevision }) => hasFixedRevision)
      .map(({ basename }) => basename)
  );
  const missingRequiredBasenames = REQUIRED_MODEL_CACHE_BASENAMES.filter(
    (basename) => !matchedBasenames.has(basename)
  );

  return {
    cacheHitVerified: missingRequiredBasenames.length === 0,
    missingRequiredBasenames,
  };
}
