// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { detectLanguages } from './languageDetector.js';

describe('detectLanguages', () => {
  it('.js 파일만 있으면 JavaScript만 반환한다', () => {
    expect(detectLanguages([{ path: 'src/index.js' }])).toEqual(['JavaScript']);
  });

  it('.tsx 파일만 있으면 TypeScript만 반환한다', () => {
    expect(detectLanguages([{ path: 'src/App.tsx' }])).toEqual(['TypeScript']);
  });

  it('.js와 .ts가 섞여 있으면 둘 다 반환한다', () => {
    const result = detectLanguages([{ path: 'src/index.js' }, { path: 'src/types.ts' }]);
    expect(result).toEqual(['JavaScript', 'TypeScript']);
  });

  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(detectLanguages([])).toEqual([]);
  });
});
