import { useEffect, useId, useState } from 'react';

import { Button, StatusMessage } from '@/shared/ui';

import type { AuthUser } from '../model/auth_types';
import './account_menu.css';

export type AccountMenuProps = {
  errorMessage?: string;
  isSigningOut?: boolean;
  onSignOut: () => void;
  user: AuthUser;
};

function getInitial(displayName: string) {
  return Array.from(displayName.trim())[0] ?? '사';
}

export function AccountMenu({
  errorMessage,
  isSigningOut = false,
  onSignOut,
  user,
}: AccountMenuProps) {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="account-menu">
      <Button
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="account-menu__trigger"
        hierarchy="ghost"
        onClick={() => setIsOpen((current) => !current)}
        size="small"
        type="button"
      >
        <span className="visually-hidden">
          {isOpen ? '계정 메뉴 닫기' : '계정 메뉴 열기'}
        </span>
        <span aria-hidden="true" className="account-menu__avatar">
          {getInitial(user.displayName)}
        </span>
        <span aria-hidden="true" className="account-menu__trigger-name">
          {user.displayName}
        </span>
      </Button>

      {isOpen ? (
        <section
          aria-label="계정 정보"
          className="account-menu__panel"
          id={panelId}
        >
          <div className="account-menu__identity">
            <strong>{user.displayName}</strong>
            {user.email ? <span>{user.email}</span> : null}
          </div>
          {errorMessage ? (
            <StatusMessage title="로그아웃하지 못했습니다" variant="error">
              <p>{errorMessage}</p>
            </StatusMessage>
          ) : null}
          <Button
            disabled={isSigningOut}
            fullWidth
            hierarchy="secondary"
            loading={isSigningOut}
            onClick={onSignOut}
            type="button"
          >
            {isSigningOut ? '로그아웃 처리 중' : '로그아웃'}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
