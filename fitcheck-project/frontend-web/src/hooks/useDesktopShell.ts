import { useEffect, useState } from 'react';
import { isFitCheckApp } from '../utils/platform';

const DESKTOP_MIN_WIDTH = 768;

/** 브라우저 + 넓은 화면일 때만 PC 사이드바 레이아웃 */
export function useDesktopShell(): boolean {
  const [isWide, setIsWide] = useState(() => {
    if (typeof window === 'undefined' || isFitCheckApp()) return false;
    return window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches;
  });

  useEffect(() => {
    if (isFitCheckApp()) return;

    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
    const onChange = () => setIsWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return !isFitCheckApp() && isWide;
}

export function useFitCheckApp(): boolean {
  return isFitCheckApp();
}
