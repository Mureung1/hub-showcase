/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readClipboardText } from './read_clipboard_text';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readClipboardText', () => {
  it('클립보드 텍스트를 공백 없이 반환한다', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        readText: vi.fn().mockResolvedValue(' https://example.com/article '),
      },
    });

    await expect(readClipboardText()).resolves.toBe(
      'https://example.com/article'
    );
  });

  it('클립보드를 읽을 수 없으면 빈 문자열을 반환한다', async () => {
    vi.stubGlobal('navigator', {});

    await expect(readClipboardText()).resolves.toBe('');
  });

  it('클립보드 권한이 거부돼도 빈 문자열을 반환한다', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        readText: vi.fn().mockRejectedValue(new Error('권한 거부')),
      },
    });

    await expect(readClipboardText()).resolves.toBe('');
  });
});
