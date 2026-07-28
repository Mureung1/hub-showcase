import type { ProductWorkspaceTextPreview } from '@ay-ple/product-contract'

export type PreparedEvidenceTarget = {
  readonly relativePath: string
  readonly contentDigest: string
  readonly quote: string
  readonly occurrence: number
}

export type PreparedEvidenceHighlight =
  | { readonly state: 'none' }
  | { readonly state: 'focused'; readonly quoteIndex: number }
  | { readonly state: 'digest_mismatch' }
  | { readonly state: 'outside_preview' }
  | { readonly state: 'locator_mismatch' }

export function resolvePreparedEvidenceHighlight(
  sourceRelativePath: string,
  preview: Pick<
    ProductWorkspaceTextPreview,
    'digest' | 'text' | 'truncated'
  >,
  target: PreparedEvidenceTarget | undefined,
): PreparedEvidenceHighlight {
  if (!target || target.relativePath !== sourceRelativePath) {
    return { state: 'none' }
  }
  if (target.contentDigest !== preview.digest) {
    return { state: 'digest_mismatch' }
  }
  const quoteIndex = findOccurrence(
    preview.text,
    target.quote,
    target.occurrence,
  )
  if (quoteIndex >= 0) {
    return { state: 'focused', quoteIndex }
  }
  return preview.truncated
    ? { state: 'outside_preview' }
    : { state: 'locator_mismatch' }
}

function findOccurrence(
  text: string,
  quote: string,
  occurrence: number,
): number {
  if (!quote || !Number.isSafeInteger(occurrence) || occurrence < 1) {
    return -1
  }
  let from = 0
  for (let index = 1; index <= occurrence; index += 1) {
    const found = text.indexOf(quote, from)
    if (found < 0) return -1
    if (index === occurrence) return found
    from = found + quote.length
  }
  return -1
}
