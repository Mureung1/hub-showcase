// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getActiveProvider } from './index.js';
import * as anthropicProvider from './anthropicProvider.js';
import * as geminiProvider from './geminiProvider.js';
import * as openaiProvider from './openaiProvider.js';

const KEYS = ['ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY'];
const originalEnv = {};

beforeEach(() => {
  for (const key of KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe('getActiveProvider', () => {
  it('설정된 키가 없으면 null을 반환한다', () => {
    expect(getActiveProvider()).toBeNull();
  });

  it('ANTHROPIC_API_KEY만 있으면 anthropicProvider를 반환한다', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    expect(getActiveProvider()).toBe(anthropicProvider);
  });

  it('GEMINI_API_KEY만 있으면 geminiProvider를 반환한다', () => {
    process.env.GEMINI_API_KEY = 'AIzaSy-test';
    expect(getActiveProvider()).toBe(geminiProvider);
  });

  it('OPENAI_API_KEY만 있으면 openaiProvider를 반환한다', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(getActiveProvider()).toBe(openaiProvider);
  });

  it('여러 키가 동시에 있으면 ANTHROPIC이 우선한다', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.GEMINI_API_KEY = 'AIzaSy-test';
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(getActiveProvider()).toBe(anthropicProvider);
  });

  it('ANTHROPIC 없이 GEMINI와 OPENAI가 있으면 GEMINI가 우선한다', () => {
    process.env.GEMINI_API_KEY = 'AIzaSy-test';
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(getActiveProvider()).toBe(geminiProvider);
  });
});
