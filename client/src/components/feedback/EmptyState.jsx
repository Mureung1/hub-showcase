import React from 'react';

/** 빈 상태 (§9) — 64px 씨앗·봉오리 라인아트 + 미래지향 문구. "없음"·"오류" 금지, CTA는 바로 아래. */
export function EmptyState({ message = '아직 아무도 초대하지 않았어요, 첫 편지를 보내볼까요?', action, style }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-6)', ...style }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--wedgwood)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto var(--space-4)' }} aria-hidden="true">
        <path d="M12 20.5V11" />
        <path d="M12 12.5C8.4 12.5 6 10 6 6.6C9.8 6.6 12 9 12 12.5Z" />
        <path d="M12 10.5C12 7.6 14 5.2 17.4 5.2C17.4 8.6 15 10.5 12 10.5Z" />
        <path d="M7 20.5H17" strokeWidth="0.7" />
      </svg>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-size)', lineHeight: 'var(--leading-body)', color: 'var(--text-caption)', margin: '0 0 var(--space-4)' }}>{message}</p>
      {action || null}
    </div>
  );
}
