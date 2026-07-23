export type EvidenceValidationResult = {
  valid: boolean;
  missingQuotes: string[];
  validCount: number;
  totalCount: number;
};

/**
 * Checks if a single quote exists in normalized source text.
 */
export function isQuoteInSource(sourceText: string, quote: string): boolean {
  if (!sourceText || !quote) return false;
  return sourceText.normalize("NFKC").includes(quote.trim());
}

/**
 * Validates whether all quotes in an evidence list are 100% exact substrings
 * of the raw source text.
 */
export function validateEvidenceQuotes(
  sourceText: string,
  quotes: string[],
): EvidenceValidationResult {
  if (!quotes || quotes.length === 0) {
    return {
      valid: true,
      missingQuotes: [],
      validCount: 0,
      totalCount: 0,
    };
  }

  const missingQuotes: string[] = [];
  let validCount = 0;

  for (const quote of quotes) {
    if (isQuoteInSource(sourceText, quote)) {
      validCount += 1;
    } else {
      missingQuotes.push(quote);
    }
  }

  return {
    valid: missingQuotes.length === 0,
    missingQuotes,
    validCount,
    totalCount: quotes.length,
  };
}
