export type PwaSharedSaveDraft = {
  source: 'android_share';
  title?: string;
  url: string;
};

const SHARE_TARGET_FRAGMENT = '#share-target';
const SHARE_TARGET_QUERY_PREFIX = `${SHARE_TARGET_FRAGMENT}?`;

export function readPwaSharedSaveDraft(
  hash: string
): PwaSharedSaveDraft | undefined {
  const params = readShareTargetParams(hash);

  if (!params) {
    return undefined;
  }

  const url = [
    params.get('shared_url'),
    params.get('shared_text'),
    params.get('shared_title'),
  ]
    .map(findHttpUrl)
    .find((candidate): candidate is string => Boolean(candidate));

  if (!url) {
    return undefined;
  }

  const title = params.get('shared_title')?.trim();

  return {
    source: 'android_share',
    ...(title && title !== url ? { title } : {}),
    url,
  };
}

export function removePwaSharedSaveFragment(path: string): string | undefined {
  const url = new URL(path, 'https://amadda.local');

  if (!readShareTargetParams(url.hash)) {
    return undefined;
  }

  return `${url.pathname}${url.search}`;
}

function readShareTargetParams(hash: string): URLSearchParams | undefined {
  if (hash === SHARE_TARGET_FRAGMENT) {
    return new URLSearchParams();
  }

  if (!hash.startsWith(SHARE_TARGET_QUERY_PREFIX)) {
    return undefined;
  }

  return new URLSearchParams(hash.slice(SHARE_TARGET_QUERY_PREFIX.length));
}

function findHttpUrl(value: string | null): string | undefined {
  const candidate = value?.match(/https?:\/\/[^\s]+/iu)?.[0];

  if (!candidate) {
    return undefined;
  }

  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? candidate
      : undefined;
  } catch {
    return undefined;
  }
}
