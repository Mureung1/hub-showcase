import type { ImportSourceAdapter } from './import_adapter';
import type { ImportCandidate } from './import_types';
import { extractHttpUrls } from './text_url_extractor';

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

    for (const { index, line, url } of extractHttpUrls(input.text)) {
      candidates.push({
        candidateId: `pasted-text:${index}`,
        capturedAtCandidate: null,
        collectionPath: [],
        explicitMemoCandidate: null,
        originalUrl: url,
        sourceLocation: `${line}번째 줄`,
        titleCandidate: null,
        warnings: ['missing-title'],
      });
    }

    return candidates;
  },
};
