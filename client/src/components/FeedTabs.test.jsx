import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FeedTabs from './FeedTabs';

describe('FeedTabs Component', () => {
  // ---------------------------------------------------------
  // 1. 정상 케이스 (Happy Path)
  // ---------------------------------------------------------
  describe('정상 동작 (Happy Path)', () => {
    it('기본 UI 요소들이 정상적으로 렌더링되어야 한다', () => {
      render(<FeedTabs currentCategory="전체" filters={{}} onCategoryChange={vi.fn()} onFilterChange={vi.fn()} />);
      
      // 검색창 확인
      expect(screen.getByPlaceholderText('키워드로 게시글을 검색해보세요')).toBeInTheDocument();
      // 필터 버튼 확인
      expect(screen.getByRole('button', { name: /필터/i })).toBeInTheDocument();
      // 카테고리 탭 확인
      expect(screen.getByText('전체')).toBeInTheDocument();
      expect(screen.getByText('질문')).toBeInTheDocument();
    });

    it('필터 버튼 클릭 시 필터 컨테이너가 표시/숨김 토글되어야 한다', () => {
      const { container } = render(<FeedTabs currentCategory="전체" filters={{}} onCategoryChange={vi.fn()} onFilterChange={vi.fn()} />);
      
      const filterContainer = container.querySelector('.tag-filter-container');
      const filterBtn = screen.getByRole('button', { name: /필터/i });

      // 초기에는 hidden 상태 (단, isFilterOpen은 false이므로 클래스에 'hidden'이 포함되어 있음)
      expect(filterContainer).toHaveClass('hidden');

      // 클릭 시 hidden 클래스 제거됨
      fireEvent.click(filterBtn);
      expect(filterContainer).not.toHaveClass('hidden');

      // 다시 클릭 시 hidden 클래스 추가됨
      fireEvent.click(filterBtn);
      expect(filterContainer).toHaveClass('hidden');
    });

    it('카테고리 탭 클릭 시 onCategoryChange가 호출되어야 한다', () => {
      const onCategoryChangeMock = vi.fn();
      render(<FeedTabs currentCategory="전체" filters={{}} onCategoryChange={onCategoryChangeMock} onFilterChange={vi.fn()} />);
      
      const questionTab = screen.getByText('질문');
      fireEvent.click(questionTab);

      expect(onCategoryChangeMock).toHaveBeenCalledTimes(1);
      expect(onCategoryChangeMock).toHaveBeenCalledWith('질문');
    });

    it('필터 칩 클릭 시 onFilterChange가 기존 객체와 병합된 값으로 호출되어야 한다', () => {
      const onFilterChangeMock = vi.fn();
      render(<FeedTabs currentCategory="전체" filters={{ reward: '식사 제공' }} onCategoryChange={vi.fn()} onFilterChange={onFilterChangeMock} />);
      
      const recruitChip = screen.getByText('모집중');
      fireEvent.click(recruitChip);

      // 기존 reward 속성은 유지되고 status 값이 추가/변경되어야 함
      expect(onFilterChangeMock).toHaveBeenCalledTimes(1);
      expect(onFilterChangeMock).toHaveBeenCalledWith({ reward: '식사 제공', status: 'recruiting' });
    });
  });

  // ---------------------------------------------------------
  // 2. 빈 값 및 초기값 (Empty Values)
  // ---------------------------------------------------------
  describe('빈 값 및 초기값 (Empty Values)', () => {
    it('filters가 빈 객체일 때 어떤 칩도 active 상태가 아니어야 한다', () => {
      render(<FeedTabs currentCategory="전체" filters={{}} onCategoryChange={vi.fn()} onFilterChange={vi.fn()} />);
      
      const recruitChip = screen.getByText('모집중');
      const coffeeChip = screen.getByText('☕ 음료 제공');
      
      expect(recruitChip).not.toHaveClass('active');
      expect(coffeeChip).not.toHaveClass('active');
    });

    it('currentCategory가 미지정일 때 활성화된 카테고리 탭이 없어야 한다', () => {
      const { container } = render(<FeedTabs filters={{}} onCategoryChange={vi.fn()} onFilterChange={vi.fn()} />);
      
      // '.web-nav__item.active' 클래스를 가진 요소가 0개여야 함
      const activeTabs = container.querySelectorAll('.web-nav__item.active');
      expect(activeTabs.length).toBe(0);
    });
  });

  // ---------------------------------------------------------
  // 3. 경계값 및 엣지 케이스 (Boundary Values)
  // ---------------------------------------------------------
  describe('경계값 및 엣지 케이스 (Boundary Values)', () => {
    it('이미 활성화된 필터 칩을 다시 클릭하면 해당 필터값이 빈 문자열로 해제되어야 한다', () => {
      const onFilterChangeMock = vi.fn();
      // '모집중'이 이미 활성화된 상태
      render(<FeedTabs currentCategory="전체" filters={{ status: 'recruiting' }} onCategoryChange={vi.fn()} onFilterChange={onFilterChangeMock} />);
      
      const recruitChip = screen.getByText('모집중');
      expect(recruitChip).toHaveClass('active');

      fireEvent.click(recruitChip);

      // 토글 로직: 값이 같으면 빈 문자열('')을 반환
      expect(onFilterChangeMock).toHaveBeenCalledWith({ status: '' });
    });

    it('유효하지 않은 필터값이 전달되어도 렌더링이 깨지지 않아야 한다', () => {
      const { container } = render(<FeedTabs currentCategory="전체" filters={{ unknown: '이상한값' }} onCategoryChange={vi.fn()} onFilterChange={vi.fn()} />);
      
      // 컴포넌트가 다운되지 않고 무사히 렌더링되는지 확인
      expect(container).toBeInTheDocument(); 
    });
  });

  // ---------------------------------------------------------
  // 4. 실패 및 예외 케이스 (Failure Cases) -> 방어적 코드 검증
  // ---------------------------------------------------------
  describe('방어적 코드 검증 (Defensive Coding)', () => {
    it('onCategoryChange 콜백이 없을 때 카테고리를 클릭해도 에러가 발생하지 않아야 한다', () => {
      render(<FeedTabs currentCategory="전체" filters={{}} onFilterChange={vi.fn()} />);
      
      expect(() => {
        fireEvent.click(screen.getByText('고민'));
      }).not.toThrow();
    });

    it('onFilterChange 콜백이 없을 때 필터를 클릭해도 에러가 발생하지 않아야 한다', () => {
      render(<FeedTabs currentCategory="전체" filters={{}} onCategoryChange={vi.fn()} />);
      
      expect(() => {
        fireEvent.click(screen.getByText('모집중'));
      }).not.toThrow();
    });
  });
});
