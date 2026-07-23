import { SCREEN_ORDER } from '../types';
import type { Screen } from '../types';

interface HeaderProps {
  screen: Screen;
  userEmail: string | null;
  onLogout: () => void;
  onEditProfile: () => void;
}

export function Header({ screen, userEmail, onLogout, onEditProfile }: HeaderProps) {
  const currentStep = SCREEN_ORDER.indexOf(screen);

  return (
    <div className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="logo-badge">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 20c8 0 14-6 16-16-10 2-16 8-16 16Z"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="logo">green-connect</span>
      </div>

      <div className="steps">
        {SCREEN_ORDER.map((step, index) => (
          <span
            key={step}
            className={index <= currentStep ? 'step-dot active' : 'step-dot'}
          />
        ))}
      </div>

      {userEmail ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            className="icon-btn"
            type="button"
            onClick={onEditProfile}
            aria-label="내 정보 수정"
            title="내 정보 수정"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
              <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            className="icon-btn"
            type="button"
            onClick={onLogout}
            aria-label="로그아웃"
            title={`${userEmail} · 로그아웃`}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : (
        <span className="user-email">로그인 전</span>
      )}
    </div>
  );
}
