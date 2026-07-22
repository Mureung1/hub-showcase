"use client";
// 앱 상태 스토어 — localStorage(즉시) + 서버(/api/state) 이중 저장.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type {
  AppStateBlob,
  Profile,
  SessionRecord,
  AssetRecord,
  Situation,
  Scores,
} from "@/lib/domain/types";
import { fetchState, putState } from "./api";

const LS_KEY = "uncoach-web-v1";
const EMPTY: AppStateBlob = { profile: null, history: [], assets: [], customSits: [] };

interface Store {
  ready: boolean;
  profile: Profile | null;
  history: SessionRecord[];
  assets: AssetRecord[];
  customSits: Situation[];
  saveProfile: (p: Profile) => void;
  addSession: (sid: string, scores: Scores) => void;
  addAsset: (text: string, sid: string) => void;
  removeAsset: (id: string) => void;
  addCustomSit: (s: Situation) => void;
  removeCustomSit: (id: string) => void;
  reset: () => void;
  /** 서버에서 상태 재로딩 (로그인/로그아웃으로 소유자가 바뀔 때) */
  reload: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

function initialBlob(): AppStateBlob {
  if (typeof window === "undefined") return EMPTY;
  try {
    const local = localStorage.getItem(LS_KEY);
    if (local) return { ...EMPTY, ...JSON.parse(local) };
  } catch {}
  return EMPTY;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  // localStorage는 렌더 시 lazy 초기화(effect에서 setState 금지 규칙 준수). 화면은 ready 전까지 로딩.
  const [blob, setBlob] = useState<AppStateBlob>(initialBlob);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 서버(DB) 상태를 비동기로 복원 — 프로필이 있으면 우선 적용. (async 콜백 내 setState는 허용)
  useEffect(() => {
    let alive = true;
    fetchState()
      .then(({ state }) => {
        if (alive && state && state.profile) setBlob({ ...EMPTY, ...state });
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: AppStateBlob) => {
    setBlob(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {}
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => putState(next), 400);
  }, []);

  const api: Store = {
    ready,
    profile: blob.profile,
    history: blob.history,
    assets: blob.assets,
    customSits: blob.customSits,
    saveProfile: (p) => persist({ ...blob, profile: p }),
    addSession: (sid, scores) => {
      const now = new Date();
      const rec: SessionRecord = { d: `${now.getMonth() + 1}.${now.getDate()}`, sid, scores, ts: now.getTime() };
      persist({ ...blob, history: [...blob.history, rec] });
    },
    addAsset: (text, sid) => {
      const now = new Date();
      const rec: AssetRecord = { id: "a" + Date.now(), text, sid, date: `${now.getMonth() + 1}.${now.getDate()}` };
      persist({ ...blob, assets: [...blob.assets, rec] });
    },
    removeAsset: (id) => persist({ ...blob, assets: blob.assets.filter((a) => a.id !== id) }),
    addCustomSit: (s) => persist({ ...blob, customSits: [...blob.customSits, s] }),
    removeCustomSit: (id) => persist({ ...blob, customSits: blob.customSits.filter((c) => c.id !== id) }),
    reset: () => persist(EMPTY),
    reload: async () => {
      const { state } = await fetchState();
      const next = state ? { ...EMPTY, ...state } : EMPTY;
      setBlob(next);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useApp(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppStateProvider");
  return v;
}
