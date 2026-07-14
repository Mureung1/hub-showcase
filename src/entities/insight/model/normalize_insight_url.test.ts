import { describe, expect, it } from 'vitest';

import * as insightApi from '../index';

describe('normalizeInsightUrl', () => {
  it('is exposed through the insight public API', () => {
    expect(insightApi).toHaveProperty(
      'normalizeInsightUrl',
      expect.any(Function)
    );
  });

  it('returns the URL contract for an http URL', () => {
    expect(
      insightApi.normalizeInsightUrl('http://example.com/articles/1')
    ).toEqual({
      ok: true,
      originalUrl: 'http://example.com/articles/1',
      normalizedUrl: 'http://example.com/articles/1',
      domain: 'example.com',
    });
  });

  it('trims surrounding whitespace from an https URL', () => {
    expect(
      insightApi.normalizeInsightUrl('  https://www.Example.com/Path  ')
    ).toEqual({
      ok: true,
      originalUrl: 'https://www.Example.com/Path',
      normalizedUrl: 'https://www.example.com/Path',
      domain: 'example.com',
    });
  });

  it('normalizes the host, default port, fragment, and root path', () => {
    expect(
      insightApi.normalizeInsightUrl('HTTPS://Example.COM:443/#section')
    ).toEqual({
      ok: true,
      originalUrl: 'HTTPS://Example.COM:443/#section',
      normalizedUrl: 'https://example.com',
      domain: 'example.com',
    });
  });

  it('removes only tracking parameters and preserves path and query details', () => {
    const rawUrl =
      'https://example.com/Docs/CaseSensitive?keep=One' +
      '&utm_source=newsletter&tag=~Exact&utm_medium=email' +
      '&utm_campaign=launch&utm_term=reader&utm_content=hero' +
      '&gclid=google&fbclid=facebook&after=Two';

    expect(insightApi.normalizeInsightUrl(rawUrl)).toEqual({
      ok: true,
      originalUrl: rawUrl,
      normalizedUrl:
        'https://example.com/Docs/CaseSensitive?keep=One&tag=~Exact&after=Two',
      domain: 'example.com',
    });
  });

  it('rejects a malformed URL', () => {
    let result: unknown;

    try {
      result = insightApi.normalizeInsightUrl('not a url');
    } catch {
      result = 'threw';
    }

    expect(result).toEqual({
      ok: false,
      reason: 'invalid-url',
    });
  });

  it('rejects an unsupported protocol', () => {
    expect(insightApi.normalizeInsightUrl('ftp://example.com/file')).toEqual({
      ok: false,
      reason: 'unsupported-protocol',
    });
  });
});
