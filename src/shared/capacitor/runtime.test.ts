import { describe, expect, it } from 'vitest';

import {
  getInsightApiOrigin,
  isNativeAndroid,
  parseApiOrigin,
  validateOptionalApiOrigin,
} from './runtime';

const nativeAndroid = {
  getPlatform: () => 'android',
  isNativePlatform: () => true,
};

describe('Capacitor 런타임', () => {
  it('네이티브 Android 플랫폼만 감지한다', () => {
    expect(isNativeAndroid(nativeAndroid)).toBe(true);
    expect(
      isNativeAndroid({
        getPlatform: () => 'ios',
        isNativePlatform: () => true,
      })
    ).toBe(false);
    expect(
      isNativeAndroid({
        getPlatform: () => 'android',
        isNativePlatform: () => false,
      })
    ).toBe(false);
  });

  it('HTTPS 또는 로컬 HTTP API 원점만 정규화한다', () => {
    expect(
      parseApiOrigin({
        VITE_CAPACITOR_API_ORIGIN: 'https://api.example.com/',
      })
    ).toBe('https://api.example.com');
    expect(
      parseApiOrigin({
        VITE_CAPACITOR_API_ORIGIN: 'http://127.0.0.1:3001',
      })
    ).toBe('http://127.0.0.1:3001');
    expect(
      parseApiOrigin({
        VITE_CAPACITOR_API_ORIGIN: 'http://localhost:3001',
      })
    ).toBe('http://localhost:3001');
  });

  it.each([
    [{}, '필요'],
    [{ VITE_CAPACITOR_API_ORIGIN: 'not-a-url' }, '올바른 URL'],
    [{ VITE_CAPACITOR_API_ORIGIN: 'http://api.example.com' }, 'HTTPS'],
    [{ VITE_CAPACITOR_API_ORIGIN: 'https://api.example.com/capture' }, '원점'],
  ])('안전하지 않거나 원점이 아닌 API 설정을 거부한다', (source, message) => {
    expect(() => parseApiOrigin(source)).toThrow(message);
  });

  it('설정하지 않은 공개 API 원점은 웹 빌드에서 허용한다', () => {
    expect(validateOptionalApiOrigin({})).toBeUndefined();
  });

  it('웹에서는 상대 API 경로를 유지하고 Android에서만 원점을 사용한다', () => {
    expect(
      getInsightApiOrigin(
        { VITE_CAPACITOR_API_ORIGIN: 'https://api.example.com' },
        nativeAndroid
      )
    ).toBe('https://api.example.com');
    expect(
      getInsightApiOrigin(
        { VITE_CAPACITOR_API_ORIGIN: 'https://api.example.com' },
        {
          getPlatform: () => 'web',
          isNativePlatform: () => false,
        }
      )
    ).toBe('');
  });
});
