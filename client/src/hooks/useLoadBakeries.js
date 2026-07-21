import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';

// 앱 시작 시 한 번 서버에서 빵집 목록을 받아와 store에 채운다.
export function useLoadBakeries() {
  const loadBakeries = useAppStore((s) => s.loadBakeries);
  useEffect(() => {
    loadBakeries();
  }, [loadBakeries]);
}
