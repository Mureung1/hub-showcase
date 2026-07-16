"use client";
import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

// 테마의 원천은 <html data-theme> (하이드레이션 전 no-flash 스크립트가 설정).
// 외부 시스템(DOM 속성)을 구독하는 방식이라 effect에서 setState 하지 않는다.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): Theme {
  return (document.documentElement.dataset.theme as Theme) || "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

/** 다크/라이트 테마 훅 — <html data-theme> + localStorage 유지 */
export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = () => {
    const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("uncoach-theme", next);
    } catch {}
    listeners.forEach((l) => l());
  };
  return [theme, toggle];
}
