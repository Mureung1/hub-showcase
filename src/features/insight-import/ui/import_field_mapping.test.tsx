/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui/design-system-provider';

import type { ImportFieldMappingRequest } from '../model/import_adapter';
import { ImportFieldMappingForm } from './import_field_mapping';

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: vi.fn(() => []),
  });
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      disconnect() {}
      observe() {}
      unobserve() {}
    }
  );
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

describe('ImportFieldMapping', () => {
  it('source별 URL·제목·메모 선택을 한 번에 제출한다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const requests: ImportFieldMappingRequest[] = [
      {
        fields: ['primary_url', 'backup_link', 'title', 'note'],
        sourceKey: 'file',
        suggested: {
          memoField: 'note',
          sourceKey: 'file',
          titleField: 'title',
          urlField: 'primary_url',
        },
      },
    ];

    render(
      <DesignSystemProvider>
        <ImportFieldMappingForm onSubmit={onSubmit} requests={requests} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('combobox', { name: 'file URL 필드' }));
    await user.click(screen.getByRole('option', { name: 'backup_link' }));
    await user.click(screen.getByRole('combobox', { name: 'file 제목 필드' }));
    await user.click(screen.getByRole('option', { name: '사용하지 않음' }));
    await user.click(screen.getByRole('button', { name: '계속' }));

    expect(onSubmit).toHaveBeenCalledWith([
      {
        memoField: 'note',
        sourceKey: 'file',
        titleField: null,
        urlField: 'backup_link',
      },
    ]);
  });
});
