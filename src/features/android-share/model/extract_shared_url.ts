const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"']+/giu;
const UNSUPPORTED_URL_PATTERN = /[a-z][a-z\d+.-]*:\/\/[^\s<>"']+/giu;
const TRAILING_SENTENCE_PUNCTUATION = /[.,!;:]+$/u;

function removeTrailingSentencePunctuation(value: string) {
  let result = value.replace(TRAILING_SENTENCE_PUNCTUATION, '');

  while (
    result.endsWith(')') &&
    [...result].filter((character) => character === ')').length >
      [...result].filter((character) => character === '(').length
  ) {
    result = result.slice(0, -1);
  }

  return result;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function extractSharedUrl(text: string) {
  for (const match of text.matchAll(HTTP_URL_PATTERN)) {
    const url = removeTrailingSentencePunctuation(match[0]);

    if (isHttpUrl(url)) {
      return url;
    }
  }

  return undefined;
}

export function hasUnsupportedSharedUrlProtocol(text: string) {
  for (const match of text.matchAll(UNSUPPORTED_URL_PATTERN)) {
    const url = removeTrailingSentencePunctuation(match[0]);

    try {
      const protocol = new URL(url).protocol;
      if (protocol !== 'http:' && protocol !== 'https:') {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}
