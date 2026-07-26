import { Parser } from 'htmlparser2';

import type { ImportSourceAdapter } from './import_adapter';
import { IMPORT_LIMITS } from './import_limits';
import type { ImportAdapterKey, ImportCandidate } from './import_types';
import { ImportFileError, readTextFile } from './read_import_file';
import { extractHttpUrls } from './text_url_extractor';

const IGNORED_TAGS = new Set([
  'audio',
  'embed',
  'iframe',
  'img',
  'object',
  'script',
  'source',
  'style',
  'video',
]);

export const genericHtmlAdapter = createTextFileAdapter(
  'generic-html',
  0.8,
  (file, text) =>
    file.type.toLowerCase() === 'text/html' ||
    /\.html?$/iu.test(file.name) ||
    /<(?:a|html|body)\b/iu.test(text.slice(0, 4096)),
  parseGenericHtml
);

export const genericMarkdownAdapter = createTextFileAdapter(
  'generic-markdown',
  0.7,
  (file, text) =>
    file.type.toLowerCase() === 'text/markdown' ||
    /\.md$/iu.test(file.name) ||
    /\[[^\]]+\]\(https?:\/\//iu.test(text.slice(0, 4096)),
  parseMarkdown
);

export const genericTextAdapter = createTextFileAdapter(
  'generic-text',
  0.1,
  () => true,
  parsePlainText
);

function createTextFileAdapter(
  adapterKey: ImportAdapterKey,
  confidence: number,
  matches: (file: File, text: string) => boolean,
  extract: (text: string) => ImportCandidate[]
): ImportSourceAdapter {
  return {
    async detect(input) {
      if (input.kind !== 'file') {
        return null;
      }

      const text = await readTextFile(input.file);

      return matches(input.file, text)
        ? { adapterKey, confidence, mappingRequests: null }
        : null;
    },
    async extract(input) {
      if (input.kind !== 'file') {
        throw new ImportFileError('unsupported-structure');
      }

      return extract(await readTextFile(input.file));
    },
  };
}

function parsePlainText(text: string) {
  const candidates = extractHttpUrls(text).map(({ index, line, url }) =>
    createCandidate('generic-text', index, url, `${line}번째 줄`, null)
  );

  assertCandidateLimit(candidates.length);
  return candidates;
}

function parseMarkdown(text: string) {
  const candidatesByOffset = new Map<number, ImportCandidate>();

  for (const match of text.matchAll(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/giu
  )) {
    const url = match[2];
    const offset = match.index + match[0].indexOf(url);
    candidatesByOffset.set(
      offset,
      createCandidate(
        'generic-markdown',
        offset,
        url,
        `Markdown ${getLineNumber(text, offset)}번째 줄`,
        normalizeText(match[1]) || null
      )
    );
  }

  for (const match of text.matchAll(/<(https?:\/\/[^>\s]+)>/giu)) {
    const url = match[1];
    const offset = match.index + 1;
    candidatesByOffset.set(
      offset,
      createCandidate(
        'generic-markdown',
        offset,
        url,
        `Markdown ${getLineNumber(text, offset)}번째 줄`,
        null
      )
    );
  }

  for (const { index, line, url } of extractHttpUrls(text)) {
    if (!candidatesByOffset.has(index)) {
      candidatesByOffset.set(
        index,
        createCandidate(
          'generic-markdown',
          index,
          url,
          `Markdown ${line}번째 줄`,
          null
        )
      );
    }
  }

  assertCandidateLimit(candidatesByOffset.size);
  return [...candidatesByOffset.values()].sort((left, right) =>
    left.candidateId.localeCompare(right.candidateId, undefined, {
      numeric: true,
    })
  );
}

function parseGenericHtml(html: string) {
  const candidates: ImportCandidate[] = [];
  let ignoredDepth = 0;
  let activeLink: { href: string; offset: number; text: string } | undefined;
  const parser = new Parser(
    {
      onclosetag(name) {
        if (IGNORED_TAGS.has(name)) {
          ignoredDepth = Math.max(0, ignoredDepth - 1);
          return;
        }

        if (ignoredDepth === 0 && name === 'a' && activeLink) {
          pushCandidate(
            candidates,
            createCandidate(
              'generic-html',
              activeLink.offset,
              activeLink.href,
              `HTML 링크 ${candidates.length + 1}`,
              normalizeText(activeLink.text) || null
            )
          );
          activeLink = undefined;
        }
      },
      onopentag(name, attributes) {
        if (IGNORED_TAGS.has(name)) {
          ignoredDepth += 1;
          return;
        }

        if (
          ignoredDepth === 0 &&
          name === 'a' &&
          typeof attributes.href === 'string'
        ) {
          activeLink = {
            href: attributes.href,
            offset: parser.startIndex,
            text: '',
          };
        }
      },
      ontext(text) {
        if (ignoredDepth > 0) {
          return;
        }

        if (activeLink) {
          activeLink.text += text;
          return;
        }

        for (const { index, url } of extractHttpUrls(text)) {
          pushCandidate(
            candidates,
            createCandidate(
              'generic-html',
              parser.startIndex + index,
              url,
              `HTML 링크 ${candidates.length + 1}`,
              null
            )
          );
        }
      },
    },
    { decodeEntities: true }
  );
  parser.end(html);

  return candidates;
}

function createCandidate(
  adapterKey: ImportAdapterKey,
  offset: number,
  originalUrl: string,
  sourceLocation: string,
  titleCandidate: string | null
): ImportCandidate {
  return {
    candidateId: `${adapterKey}:${offset}`,
    capturedAtCandidate: null,
    collectionPath: [],
    explicitMemoCandidate: null,
    originalUrl,
    sourceLocation,
    titleCandidate,
    warnings: titleCandidate ? [] : ['missing-title'],
  };
}

function getLineNumber(text: string, offset: number) {
  return (text.slice(0, offset).match(/\n/gu)?.length ?? 0) + 1;
}

function normalizeText(value: string) {
  return value.replace(/\s+/gu, ' ').trim();
}

function pushCandidate(
  candidates: ImportCandidate[],
  candidate: ImportCandidate
) {
  if (candidates.length >= IMPORT_LIMITS.candidateCount) {
    throw new ImportFileError('limit-exceeded');
  }

  candidates.push(candidate);
}

function assertCandidateLimit(candidateCount: number) {
  if (candidateCount > IMPORT_LIMITS.candidateCount) {
    throw new ImportFileError('limit-exceeded');
  }
}
