import type { ImportSourceAdapter } from './import_adapter';
import type { ImportCandidate } from './import_types';

const TRAILING_PUNCTUATION = new Set(['.', ',', '!', ';', ':']);
const CLOSING_BRACKETS = new Map([
  [')', '('],
  [']', '['],
  ['}', '{'],
]);

export const pastedTextAdapter: ImportSourceAdapter = {
  async detect(input) {
    if (input.kind !== 'pasted-text') {
      return null;
    }

    return {
      adapterKey: 'pasted-text',
      confidence: 1,
      mappingRequests: null,
    };
  },

  async extract(input) {
    if (input.kind !== 'pasted-text') {
      return [];
    }

    const candidates: ImportCandidate[] = [];

    for (const match of input.text.matchAll(/https?:\/\/[^\s<>"']+/giu)) {
      const matchIndex = match.index;
      const originalUrl = removeTrailingDelimiters(match[0]);

      candidates.push({
        candidateId: `pasted-text:${matchIndex}`,
        capturedAtCandidate: null,
        collectionPath: [],
        explicitMemoCandidate: null,
        originalUrl,
        sourceLocation: `${getLineNumber(input.text, matchIndex)}번째 줄`,
        titleCandidate: null,
        warnings: ['missing-title'],
      });
    }

    return candidates;
  },
};

function removeTrailingDelimiters(rawUrl: string) {
  let url = rawUrl;

  while (url.length > 0) {
    const finalCharacter = url.at(-1) ?? '';

    if (TRAILING_PUNCTUATION.has(finalCharacter)) {
      url = url.slice(0, -1);
      continue;
    }

    const openingBracket = CLOSING_BRACKETS.get(finalCharacter);

    if (
      openingBracket !== undefined &&
      countCharacter(url, finalCharacter) > countCharacter(url, openingBracket)
    ) {
      url = url.slice(0, -1);
      continue;
    }

    break;
  }

  return url;
}

function countCharacter(value: string, character: string) {
  return [...value].filter((current) => current === character).length;
}

function getLineNumber(text: string, matchIndex: number) {
  return (text.slice(0, matchIndex).match(/\n/g)?.length ?? 0) + 1;
}
