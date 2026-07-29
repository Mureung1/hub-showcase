import React, { useSyncExternalStore } from 'react';
import { isMuted, setMuted, subscribeMuted } from '../../lib/sound.js';

/** 전역 음소거 토글 — 화면 어디서나 동일 위치(우측 하단, 서명 글리프 위)에 1개만 마운트.
    켜짐: 스피커+음파 / 꺼짐: 스피커만 (경고색·사선 없음, §「하지 말 것」 규칙 준수). */
export function SoundToggle() {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, isMuted);

  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-pressed={!muted}
      aria-label={muted ? '소리 켜기' : '소리 끄기'}
      title={muted ? '소리 켜기' : '소리 끄기'}
      style={{
        position: 'fixed',
        right: '14px',
        bottom: '38px',
        zIndex: 51,
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'none',
        padding: 0,
        cursor: 'pointer',
        opacity: 0.5,
        outlineColor: 'var(--focus-ring)',
        transition: `opacity var(--dur-press) var(--ease-soft)`,
      }}
      onPointerEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
      onPointerLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
      onFocus={(e) => { e.currentTarget.style.opacity = '1'; }}
      onBlur={(e) => { e.currentTarget.style.opacity = '0.5'; }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--wedgwood-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5V14.5H8L13.5 19V5L8 9.5H4Z" />
        {!muted ? <path d="M17 9C18.2 10 18.9 11.4 18.9 13S18.2 16 17 17" /> : null}
      </svg>
    </button>
  );
}
