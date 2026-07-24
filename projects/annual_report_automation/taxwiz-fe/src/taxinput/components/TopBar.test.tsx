// TopBar의 "약 N문항 남음"(todo count) 표시 테스트 — TDD red→green 연습으로 작성.
// (이 테스트를 먼저 써서 실패를 확인한 뒤, TopBar에 remainingEst prop을 추가해 통과시켰다.
//  제목 옆 eyebrow의 기존 표시(TaxInputWizard.tsx)와는 별개 — 그쪽은 그대로 유지.)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ANNUAL_TOPIC_ORDER } from '../catalog';
import { TopBar } from './TopBar';

// TOPIC_META[topicKey].section 접근 때문에 실제 존재하는 토픽 키가 필요하다
const topicKey = ANNUAL_TOPIC_ORDER[0];
const 필수props = { topicKey, progressPct: 30, canGoBack: false, onBack: () => {} };

describe('TopBar 잔여 문항 카운트', () => {
  it('remainingEst를 주면 "약 N문항 남음"을 상단 바에 보여준다', () => {
    render(<TopBar {...필수props} remainingEst={12} />);
    expect(screen.getByText(/약 12문항 남음/)).toBeInTheDocument();
  });

  it('remainingEst가 0이면 보여주지 않는다', () => {
    // 다 끝나가는데 "약 0문항 남음"이 떠 있으면 오히려 헷갈린다
    render(<TopBar {...필수props} remainingEst={0} />);
    expect(screen.queryByText(/문항 남음/)).not.toBeInTheDocument();
  });

  it('prop을 안 넘기면 보여주지 않는다 — 기존 호출부 하위호환', () => {
    render(<TopBar {...필수props} />);
    expect(screen.queryByText(/문항 남음/)).not.toBeInTheDocument();
  });
});
