/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui';

import { PwaInstallNotice } from './pwa_install_notice';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

afterEach(cleanup);

describe('PwaInstallNotice', () => {
  it('비모달 안내에서 설치와 나중에 동작을 제공한다', async () => {
    const user = userEvent.setup();
    const onInstall = vi.fn();
    const onDismiss = vi.fn();

    render(
      <DesignSystemProvider>
        <PwaInstallNotice
          isPrompting={false}
          onDismiss={onDismiss}
          onInstall={onInstall}
        />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('region', { name: '더 빠르게 저장하기' })
    ).not.toBeNull();
    const installButton = screen.getByRole('button', { name: '설치하기' });
    const dismissButton = screen.getByRole('button', {
      name: '나중에 설치하기',
    });
    expect(installButton.getAttribute('type')).toBe('button');
    expect(dismissButton.getAttribute('type')).toBe('button');

    await user.click(installButton);
    await user.click(dismissButton);

    expect(onInstall).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('설치 요청 중에는 두 동작을 모두 비활성화한다', () => {
    render(
      <DesignSystemProvider>
        <PwaInstallNotice isPrompting onDismiss={vi.fn()} onInstall={vi.fn()} />
      </DesignSystemProvider>
    );

    expect(
      screen
        .getByRole('button', { name: '설치하고 있어요' })
        .hasAttribute('disabled')
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: '나중에 설치하기' })
        .hasAttribute('disabled')
    ).toBe(true);
  });

  it('모바일에서 두 행동을 전폭으로 배치한다', () => {
    const styles = readFileSync(
      join(process.cwd(), 'src/features/pwa-install/ui/pwa_install_notice.css'),
      'utf8'
    );
    const mobileStyles = styles.slice(
      styles.indexOf('@media (max-width: 767px)')
    );

    expect(mobileStyles).toContain('.pwa-install-notice__actions');
    expect(mobileStyles).toContain('width: 100%');
  });
});
