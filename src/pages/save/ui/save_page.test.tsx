/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui';

import { SavePage } from './save_page';

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

describe('SavePage', () => {
  it('reports URL changes and save submission', () => {
    const onSave = vi.fn();
    const onUrlChange = vi.fn();

    const { container } = render(
      <DesignSystemProvider>
        <SavePage
          onSave={onSave}
          onSaveCompleteChange={vi.fn()}
          onUrlChange={onUrlChange}
          saveComplete={false}
          saveUrl=""
          suggestedCategories={[]}
        />
      </DesignSystemProvider>
    );

    fireEvent.change(screen.getByRole('textbox', { name: '링크 URL' }), {
      target: { value: 'https://example.com/article' },
    });
    fireEvent.submit(container.querySelector('form')!);

    expect(onUrlChange).toHaveBeenCalledWith('https://example.com/article');
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('lets the app validation handle malformed URLs', () => {
    const { container } = render(
      <DesignSystemProvider>
        <SavePage
          onSave={vi.fn()}
          onSaveCompleteChange={vi.fn()}
          onUrlChange={vi.fn()}
          saveComplete={false}
          saveUrl=""
          suggestedCategories={[]}
        />
      </DesignSystemProvider>
    );

    expect(container.querySelector('form')?.noValidate).toBe(true);
  });
});
