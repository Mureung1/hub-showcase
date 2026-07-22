import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';

// 앱 시작 시 한 번, localStorage에 남은 토큰이 있으면 그걸로 로그인 상태를 복원한다.
export function useRestoreSession() {
  const restoreSession = useAppStore((s) => s.restoreSession);
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);
}
