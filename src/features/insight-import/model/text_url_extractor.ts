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

  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/giu)) {
    const index = match.index;
    const url = removeTrailingDelimiters(match[0]);

    urls.push({
      index,
      line: getLineNumber(text, index),
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

function getLineNumber(text: string, matchIndex: number) {
  return (text.slice(0, matchIndex).match(/\n/g)?.length ?? 0) + 1;
}
