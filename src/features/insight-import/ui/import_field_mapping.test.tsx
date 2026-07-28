/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

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

afterEach(cleanup);

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

  it('새 요청 집합으로 바뀌면 추천 매핑을 다시 표시한다', () => {
    const firstRequest: ImportFieldMappingRequest = {
      fields: ['first_url'],
      sourceKey: 'first.csv',
      suggested: {
        memoField: null,
        sourceKey: 'first.csv',
        titleField: null,
        urlField: 'first_url',
      },
    };
    const secondRequest: ImportFieldMappingRequest = {
      fields: ['second_url'],
      sourceKey: 'second.csv',
      suggested: {
        memoField: null,
        sourceKey: 'second.csv',
        titleField: null,
        urlField: 'second_url',
      },
    };
    const { rerender } = render(
      <DesignSystemProvider>
        <ImportFieldMappingForm onSubmit={vi.fn()} requests={[firstRequest]} />
      </DesignSystemProvider>
    );

    rerender(
      <DesignSystemProvider>
        <ImportFieldMappingForm onSubmit={vi.fn()} requests={[secondRequest]} />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('combobox', { name: 'second.csv URL 필드' })
    ).toBeTruthy();
    expect(
      screen.queryByRole('combobox', { name: 'first.csv URL 필드' })
    ).toBeNull();
  });

  it('대화상자 footer의 외부 버튼으로 form을 제출한다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const requests: ImportFieldMappingRequest[] = [
      {
        fields: ['url'],
        sourceKey: 'file.csv',
        suggested: {
          memoField: null,
          sourceKey: 'file.csv',
          titleField: null,
          urlField: 'url',
        },
      },
    ];

    render(
      <DesignSystemProvider>
        <ImportFieldMappingForm
          formId="import-field-mapping-form"
          onSubmit={onSubmit}
          requests={requests}
          showSubmitButton={false}
        />
        <button form="import-field-mapping-form" type="submit">
          외부 계속
        </button>
      </DesignSystemProvider>
    );

    expect(screen.queryByRole('button', { name: '계속' })).toBeNull();

    await user.click(screen.getByRole('button', { name: '외부 계속' }));

    expect(onSubmit).toHaveBeenCalledWith([
      {
        memoField: null,
        sourceKey: 'file.csv',
        titleField: null,
        urlField: 'url',
      },
    ]);
  });
});
