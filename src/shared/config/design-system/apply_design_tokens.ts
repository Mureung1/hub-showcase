import { designTokens } from './tokens';
import type { DesignTokens } from './tokens';

function toKebabCase(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function createDesignTokenEntries(
  tokens: DesignTokens = designTokens
): Array<[string, string]> {
  return Object.entries(tokens).flatMap(([groupName, group]) => {
    return Object.entries(group).map(([tokenName, value]): [string, string] => [
      `--${toKebabCase(groupName)}-${toKebabCase(tokenName)}`,
      value,
    ]);
  });
}

export function applyDesignTokens(
  root: HTMLElement = document.documentElement
): void {
  createDesignTokenEntries().forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}
