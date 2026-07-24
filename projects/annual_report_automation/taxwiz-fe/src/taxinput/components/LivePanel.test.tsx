// "약 N문항 남음"(todo count) 표시 테스트 — 원래 TopBar.test.tsx로 TDD red→green 하며
// 쓴 것을, DESIGN.md §9.1에서 진행률/잔여 문항이 상단 바 → 우측 LivePanel로 옮겨감에 따라
// 그대로 이 컴포넌트로 옮겼다 (단언 3개는 동일).
// 아래쪽 대차평형 테스트는 §8.2("어긋남을 조용히 두지 않는다")를 고정하기 위한 것.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createInitialState } from '../types';
import type { TaxInputState } from '../types';
import { LivePanel } from './LivePanel';

const 빈상태 = createInitialState();
const 필수props = { data: 빈상태, progressPct: 30 };

/** 재무상태표 계정에 금액을 채운 상태를 만든다 — 대차평형 판정만 보기 위한 최소 입력.
 *  bsSumKind는 BS_GROUPS의 core 계정과목만 합산하므로 키는 실제 과목명이어야 한다. */
function bs(values: Record<string, string>): TaxInputState {
  return { ...빈상태, bs: { ...빈상태.bs, ...values } };
}

describe('LivePanel 잔여 문항 카운트', () => {
  it('remainingEst를 주면 "약 N문항 남음"을 보여준다', () => {
    render(<LivePanel {...필수props} remainingEst={12} />);
    expect(screen.getByText(/약 12문항 남음/)).toBeInTheDocument();
  });

  it('remainingEst가 0이면 보여주지 않는다', () => {
    // 다 끝나가는데 "약 0문항 남음"이 떠 있으면 오히려 헷갈린다
    render(<LivePanel {...필수props} remainingEst={0} />);
    expect(screen.queryByText(/문항 남음/)).not.toBeInTheDocument();
  });

  it('prop을 안 넘기면 보여주지 않는다', () => {
    render(<LivePanel {...필수props} />);
    expect(screen.queryByText(/문항 남음/)).not.toBeInTheDocument();
  });
});

describe('LivePanel 대차평형', () => {
  it('아무것도 안 적었으면 0=0을 "맞아요"라고 하지 않는다', () => {
    // 입력 전 상태에서 "맞아요"가 뜨면 검산이 끝난 것 같은 거짓 안심을 준다
    render(<LivePanel {...필수props} />);
    expect(screen.getByText('입력 전')).toBeInTheDocument();
    expect(screen.queryByText('맞아요')).not.toBeInTheDocument();
  });

  it('자산 = 부채+자본이면 맞다고 표시한다', () => {
    render(<LivePanel {...필수props} data={bs({ 현금: '1000', 자본금: '1000' })} />);
    expect(screen.getByText('맞아요')).toBeInTheDocument();
  });

  it('어긋나면 차액 금액과 어느 쪽이 많은지를 함께 알려준다', () => {
    render(<LivePanel {...필수props} data={bs({ 현금: '1000', 자본금: '400' })} />);
    expect(screen.getByText('안 맞아요')).toBeInTheDocument();
    expect(screen.getByText('600원')).toBeInTheDocument();
    expect(screen.getByText(/자산이 많아요/)).toBeInTheDocument();
  });
});
