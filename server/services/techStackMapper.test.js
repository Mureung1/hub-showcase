// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { classifyWithDictionary } from './techStackMapper.js';

describe('classifyWithDictionary', () => {
  it('express는 framework로 매칭된다', () => {
    const { matched } = classifyWithDictionary(['express']);
    expect(matched.framework).toEqual(['express']);
  });

  it('pg는 database로 매칭된다', () => {
    const { matched } = classifyWithDictionary(['pg']);
    expect(matched.database).toEqual(['pg']);
  });

  it('redis는 database로 매칭된다', () => {
    const { matched } = classifyWithDictionary(['redis']);
    expect(matched.database).toEqual(['redis']);
  });

  it('eslint, vitest 같은 개발 도구는 완전히 제외된다', () => {
    const { matched, unclassified } = classifyWithDictionary(['eslint', 'vitest']);
    expect(matched.framework).toEqual([]);
    expect(matched.database).toEqual([]);
    expect(matched.infra).toEqual([]);
    expect(matched.language).toEqual([]);
    expect(unclassified).toEqual([]);
  });

  it('사전에도 EXCLUDED에도 없는 낯선 이름은 unclassified에 잡힌다', () => {
    const { unclassified } = classifyWithDictionary(['some-random-lib-xyz']);
    expect(unclassified).toEqual(['some-random-lib-xyz']);
  });

  it('중복된 이름은 한 번만 반영된다', () => {
    const { matched } = classifyWithDictionary(['express', 'express', 'Express']);
    expect(matched.framework).toEqual(['express']);
  });
});
