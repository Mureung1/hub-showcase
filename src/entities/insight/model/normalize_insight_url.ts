const TRACKING_PARAMETER_NAMES = new Set<string>([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
]);

export function normalizeInsightUrl(rawUrl: string) {
  const originalUrl = rawUrl.trim();
  let url: URL;

  try {
    url = new URL(originalUrl);
  } catch {
    return { ok: false as const, reason: 'invalid-url' as const };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false as const, reason: 'unsupported-protocol' as const };
  }

  if (url.search) {
    const preservedParameters = url.search
      .slice(1)
      .split('&')
      .filter((parameter) => {
        const name = new URLSearchParams(parameter).keys().next().value;

        return name === undefined || !TRACKING_PARAMETER_NAMES.has(name);
      });

    url.search =
      preservedParameters.length > 0 ? `?${preservedParameters.join('&')}` : '';
  }

  url.hash = '';

  let normalizedUrl = url.toString();

  if (url.pathname === '/') {
    const rootPathIndex = normalizedUrl.indexOf('/', url.protocol.length + 2);

    normalizedUrl =
      normalizedUrl.slice(0, rootPathIndex) +
      normalizedUrl.slice(rootPathIndex + 1);
  }

  return {
    ok: true as const,
    originalUrl,
    normalizedUrl,
    domain: url.hostname.replace(/^www\./, ''),
  };
}
