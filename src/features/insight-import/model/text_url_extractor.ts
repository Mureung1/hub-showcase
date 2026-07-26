const TRAILING_PUNCTUATION = new Set(['.', ',', '!', ';', ':']);
const CLOSING_BRACKETS = new Map([
  [')', '('],
  [']', '['],
  ['}', '{'],
]);

export type ExtractedTextUrl = {
  index: number;
  line: number;
  url: string;
};

export function extractHttpUrls(text: string): ExtractedTextUrl[] {
  const urls: ExtractedTextUrl[] = [];
  let line = 1;
  let scannedUntil = 0;

  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/giu)) {
    const index = match.index;
    const url = removeTrailingDelimiters(match[0]);

    for (let position = scannedUntil; position < index; position += 1) {
      if (text.charCodeAt(position) === 10) {
        line += 1;
      }
    }
    scannedUntil = index;

    urls.push({
      index,
      line,
      url,
    });
  }

  return urls;
}

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
