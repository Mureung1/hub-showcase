const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

function hasFinalConsonant(word: string): boolean {
  const lastChar = word.charCodeAt(word.length - 1);
  if (lastChar < HANGUL_BASE || lastChar > HANGUL_LAST) return false;
  return (lastChar - HANGUL_BASE) % 28 !== 0;
}

export function eunNeun(word: string): '은' | '는' {
  return hasFinalConsonant(word) ? '은' : '는';
}

export function iGa(word: string): '이' | '가' {
  return hasFinalConsonant(word) ? '이' : '가';
}
