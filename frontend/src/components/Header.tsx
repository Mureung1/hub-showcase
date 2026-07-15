import { SCREEN_ORDER } from '../types';
import type { Screen } from '../types';

interface HeaderProps {
  screen: Screen;
  userEmail: string | null;
  onLogout: () => void;
}

export function Header({ screen, userEmail, onLogout }: HeaderProps) {
  const currentStep = SCREEN_ORDER.indexOf(screen);

  return (
    <div className="app-header">
      <span className="logo">그린커넥트</span>

      <div className="steps">
        {SCREEN_ORDER.map((step, index) => (
          <span
            key={step}
            className={index <= currentStep ? 'step-dot active' : 'step-dot'}
          />
        ))}
      </div>

      {userEmail ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="user-email">{userEmail}</span>
          <button
            className="btn-outline"
            type="button"
            onClick={onLogout}
            style={{ width: 'auto', padding: '4px 8px', fontSize: 11 }}
          >
            로그아웃
          </button>
        </div>
      ) : (
        <span className="user-email">로그인 전</span>
      )}
    </div>
  );
}
