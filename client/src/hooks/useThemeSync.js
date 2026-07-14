import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';

// store의 theme 값을 <html data-theme="..">에 반영해 다크모드 CSS 변수가 적용되게 한다.
export function useThemeSync() {
  const theme = useAppStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
}
