import { Parser } from 'htmlparser2';

import type { ImportSourceAdapter } from './import_adapter';
import { IMPORT_LIMITS } from './import_limits';
import type { ImportCandidate } from './import_types';
import { ImportFileError, readTextFile } from './read_import_file';

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

export const bookmarkHtmlAdapter: ImportSourceAdapter = {
  async detect(input) {
    if (input.kind !== 'file') {
      return null;
    }

    const prefix = (await readTextFile(input.file)).slice(0, 4096);

    if (
      !/NETSCAPE-Bookmark-file-1/iu.test(prefix) ||
      !/\bHREF\s*=/iu.test(prefix)
    ) {
      return null;
    }

    return {
      adapterKey: 'bookmark-html',
      confidence: 1,
      mappingRequests: null,
    };
  },

  async extract(input) {
    if (input.kind !== 'file') {
      throw new ImportFileError('unsupported-structure');
    }

    return parseBookmarkHtml(await readTextFile(input.file));
  },
};

function parseBookmarkHtml(html: string) {
  const candidates: ImportCandidate[] = [];
  const collectionPath: string[] = [];
  const dlFolderStack: boolean[] = [];
  let pendingFolder: string | null = null;
  let headingText: string | null = null;
  let ignoredDepth = 0;
  let activeLink:
    | {
        addDate: string | undefined;
        href: string;
        offset: number;
        text: string;
      }
    | undefined;
  const parser = new Parser(
    {
      onclosetag(name) {
        if (IGNORED_TAGS.has(name)) {
          ignoredDepth = Math.max(0, ignoredDepth - 1);
          return;
        }

        if (ignoredDepth > 0) {
          return;
        }

        if (name === 'h3' && headingText !== null) {
          pendingFolder = normalizeText(headingText) || null;
          headingText = null;
          return;
        }

        if (name === 'a' && activeLink) {
          pushCandidate(candidates, {
            candidateId: `bookmark-html:${activeLink.offset}`,
            capturedAtCandidate: parseBookmarkDate(activeLink.addDate),
            collectionPath: [...collectionPath],
            explicitMemoCandidate: null,
            originalUrl: activeLink.href,
            sourceLocation: `북마크 ${candidates.length + 1}`,
            titleCandidate: normalizeText(activeLink.text) || null,
            warnings: normalizeText(activeLink.text) ? [] : ['missing-title'],
          });
          activeLink = undefined;
          return;
        }

        if (name === 'dl' && dlFolderStack.pop()) {
          collectionPath.pop();
        }
      },
      onopentag(name, attributes) {
        if (IGNORED_TAGS.has(name)) {
          ignoredDepth += 1;
          return;
        }

        if (ignoredDepth > 0) {
          return;
        }

        if (name === 'h3') {
          headingText = '';
          return;
        }

        if (name === 'dl') {
          const hasFolder = pendingFolder !== null;
          dlFolderStack.push(hasFolder);

          if (pendingFolder !== null) {
            collectionPath.push(pendingFolder);
            pendingFolder = null;
          }
          return;
        }

        if (name === 'a' && typeof attributes.href === 'string') {
          activeLink = {
            addDate: attributes.add_date,
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

        if (headingText !== null) {
          headingText += text;
        }

        if (activeLink) {
          activeLink.text += text;
        }
      },
    },
    { decodeEntities: true }
  );
  parser.end(html);

  return candidates;
}

function parseBookmarkDate(value: string | undefined) {
  if (!value || !/^\d+$/u.test(value)) {
    return null;
  }

  const milliseconds = Number(value) * 1000;
  const date = new Date(milliseconds);

  return Number.isFinite(milliseconds) && !Number.isNaN(date.getTime())
    ? date.toISOString()
    : null;
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
