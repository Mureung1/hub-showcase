'use client';

import { useActionState } from 'react';
import { logoutAction } from '../../actions/auth-actions';
import { initialActionState } from '../../errors/action-state';

export function LogoutForm() {
  const [state, action, pending] = useActionState(logoutAction, initialActionState);

  return (
    <form className="logout-form" action={action}>
      <button
        type="submit"
        className="button nav-logout"
        disabled={pending}
        aria-disabled={pending}
      >
        {pending ? '로그아웃 중…' : '로그아웃'}
      </button>
      {state.status === 'error' && state.message && (
        <span className="logout-error" role="alert">
          {state.message}
        </span>
      )}
    </form>
  );
}
