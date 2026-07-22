import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CurationWorkspace from '../CurationWorkspace.js';
import { CurationData, Paper, LibraryItem } from '../../types/index.js';
import { vi, describe, it, expect } from 'vitest';

describe('CurationWorkspace Component Test', () => {
  const mockSetSavedPapers = vi.fn();
  const mockHandleRemovePaper = vi.fn();

  const mockCurationData: CurationData = {
    papers: [
      {
        paperId: 'paper-001',
        title: 'Lost in the Middle: How Language Models Use Long Contexts',
        authors: 'Nelson F. Liu, Kevin Lin',
        channel: 'arXiv',
        year: 2023,
        matchScore: 98,
        insights: {
          background: '긴 컨텍스트 내에서 중간 정보 유실 문제 제기.',
          coreMethod: '입력 데이터 내 타깃 위치 변화에 따른 정확도 U자 곡선 증명.',
          quantitativeResult: '중간 정보 유실 시 모델 정확도 최대 40% 이상 하락.'
        }
      }
    ]
  };

  const defaultProps = {
    lang: 'KO' as const,
    curationData: mockCurationData,
    userId: 'test-user-uuid',
    savedPapers: [] as LibraryItem[],
    setSavedPapers: mockSetSavedPapers,
    handleRemovePaper: mockHandleRemovePaper
  };

  beforeAll(() => {
    // jsdom에 구현되어 있지 않은 window.alert 모킹
    window.alert = vi.fn();
  });

  it('1. should render paper cards and show selected paper insights on render', () => {
    render(<CurationWorkspace {...defaultProps} />);

    // 좌측 결과 리스트 렌더링 확인 (여러 엘리먼트가 존재하므로 getAllByText로 대응)
    const titleElements = screen.getAllByText(/Lost in the Middle/);
    expect(titleElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Nelson F. Liu, Kevin Lin/)).toBeInTheDocument();
    expect(screen.getByText(/98% Match/)).toBeInTheDocument();

    // 우측 에이전트 3줄 핵심 요약이 첫 번째 논문 기준으로 렌더링되었는지 확인
    expect(screen.getByText(/긴 컨텍스트 내에서 중간 정보 유실 문제 제기/)).toBeInTheDocument();
  });

  it('2. should trigger handleSavePaper and append paper to savedPapers via MSW on save button click', async () => {
    const user = userEvent.setup();
    render(<CurationWorkspace {...defaultProps} />);

    // "내 서재 보관" 버튼 클릭 시뮬레이션
    const saveButtons = screen.getAllByRole('button', { name: /내 서재 보관/ });
    // 첫 번째 저장 버튼 클릭 (리스트 내 논문 저장 버튼)
    await user.click(saveButtons[0]);

    // MSW가 가로챈 후 setSavedPapers가 성공적으로 호출되었는지 검증
    expect(mockSetSavedPapers).toHaveBeenCalled();
  });
});
