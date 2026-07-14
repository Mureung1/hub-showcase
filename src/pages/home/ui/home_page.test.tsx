/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui';

import { HomePage, type SuggestedSituation } from './home_page';

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

const situations: SuggestedSituation[] = [
  { label: '개발 공부', query: '리액트 상태 관리' },
];

describe('HomePage', () => {
  it('reports situation selection and retrieve submission', async () => {
    const user = userEvent.setup();
    const onRetrieve = vi.fn();
    const onSituationClick = vi.fn();

    render(
      <DesignSystemProvider>
        <HomePage
          onOpenLibrary={vi.fn()}
          onQueryChange={vi.fn()}
          onRetrieve={onRetrieve}
          onSituationClick={onSituationClick}
          query="리액트"
          results={[]}
          selectedSituation=""
          situations={situations}
        />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '개발 공부' }));
    fireEvent.submit(
      screen.getByRole('button', { name: '꺼내보기' }).closest('form')!
    );

    expect(onSituationClick).toHaveBeenCalledWith(situations[0]);
    expect(onRetrieve).toHaveBeenCalledOnce();
  });

  it('opens the library from the empty result state', async () => {
    const user = userEvent.setup();
    const onOpenLibrary = vi.fn();

    render(
      <DesignSystemProvider>
        <HomePage
          onOpenLibrary={onOpenLibrary}
          onQueryChange={vi.fn()}
          onRetrieve={vi.fn()}
          onSituationClick={vi.fn()}
          query=""
          results={[]}
          selectedSituation=""
          situations={situations}
        />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('heading', {
        name: '꺼내볼 인사이트가 아직 없어요',
      })
    ).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '보관함 보기' }));

    expect(onOpenLibrary).toHaveBeenCalledOnce();
  });
});
