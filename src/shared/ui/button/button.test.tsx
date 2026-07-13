/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { Button, DesignSystemProvider } from '@/shared/ui';

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

describe('Button', () => {
  it('renders the primary hierarchy and forwards click interactions', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <DesignSystemProvider>
        <Button hierarchy="primary" onClick={onClick}>
          저장하기
        </Button>
      </DesignSystemProvider>
    );

    const button = screen.getByRole('button', { name: '저장하기' });

    expect(button.classList.contains('ui-button--primary')).toBe(true);

    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('blocks click interactions when disabled', () => {
    const onClick = vi.fn();

    render(
      <DesignSystemProvider>
        <Button disabled onClick={onClick}>
          저장 중
        </Button>
      </DesignSystemProvider>
    );

    const button = screen.getByRole('button', { name: '저장 중' });

    fireEvent.click(button);

    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('blocks click interactions when aria-disabled', () => {
    const onClick = vi.fn();

    render(
      <DesignSystemProvider>
        <Button aria-disabled onClick={onClick}>
          저장 중
        </Button>
      </DesignSystemProvider>
    );

    const button = screen.getByRole('button', { name: '저장 중' });

    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('activates from the keyboard', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <DesignSystemProvider>
        <Button onClick={onClick}>계속하기</Button>
      </DesignSystemProvider>
    );

    const button = screen.getByRole('button', { name: '계속하기' });

    button.focus();
    await user.keyboard('{Enter}');

    expect(document.activeElement).toBe(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
