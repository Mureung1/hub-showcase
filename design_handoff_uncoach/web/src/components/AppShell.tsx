"use client";
import { useState } from "react";
import { useApp } from "@/lib/client/store";
import type { Situation } from "@/lib/domain/types";
import Onboarding from "./screens/Onboarding";
import Home from "./screens/Home";
import Picker from "./screens/Picker";
import Train from "./screens/Train";
import Trajectory from "./screens/Trajectory";
import NewSituation from "./screens/NewSituation";
import Settings from "./screens/Settings";

export type Screen = "home" | "picker" | "train" | "trajectory" | "newsit" | "settings";

const NAV: { key: Screen; label: string; dot: string }[] = [
  { key: "home", label: "홈", dot: "🏠" },
  { key: "picker", label: "훈련", dot: "✍️" },
  { key: "trajectory", label: "궤적", dot: "📈" },
  { key: "settings", label: "설정", dot: "⚙️" },
];

export default function AppShell() {
  const app = useApp();
  const [screen, setScreen] = useState<Screen>("home");
  const [activeSit, setActiveSit] = useState<Situation | null>(null);
  const [reprofile, setReprofile] = useState(false);

  if (!app.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: "var(--sub)" }}>
        불러오는 중…
      </div>
    );
  }
  if (!app.profile || reprofile) {
    return (
      <Onboarding
        onDone={() => {
          setReprofile(false);
          setScreen("home");
        }}
      />
    );
  }

  const startSit = (s: Situation) => {
    setActiveSit(s);
    setScreen("train");
  };

  const navActive = (key: Screen) =>
    screen === key || (key === "picker" && (screen === "train" || screen === "newsit"));

  return (
    <div className="min-h-screen md:flex" style={{ background: "var(--bg)" }}>
      {/* 데스크톱 사이드바 */}
      <aside
        className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col md:flex"
        style={{ background: "var(--side)" }}
      >
        <div className="px-5 pb-6 pt-7">
          <div className="text-xl font-extrabold text-white">언코</div>
          <div className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--side-dim)" }}>
            화용 능력 코칭 에이전트
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV.map((n) => {
            const on = navActive(n.key);
            return (
              <button
                key={n.key}
                onClick={() => setScreen(n.key)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-semibold transition"
                style={{ background: on ? "rgba(255,255,255,0.1)" : "transparent", color: on ? "#fff" : "var(--side-dim)" }}
              >
                <span className="text-base">{n.dot}</span>
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto px-5 pb-6 text-[11px] leading-relaxed" style={{ color: "var(--side-dim)" }}>
          {app.profile.role}
          {app.profile.age ? ` · ${app.profile.age}` : ""}
        </div>
      </aside>

      {/* 메인 */}
      <div className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-6 sm:px-6">
          {screen === "home" && <Home onPick={() => setScreen("picker")} startSit={startSit} />}
          {screen === "picker" && <Picker onPick={startSit} onNewSit={() => setScreen("newsit")} />}
          {screen === "train" && activeSit && (
            <Train situation={activeSit} onExit={() => setScreen("picker")} onFinish={() => setScreen("home")} />
          )}
          {screen === "newsit" && <NewSituation onStart={startSit} onCancel={() => setScreen("picker")} />}
          {screen === "trajectory" && <Trajectory />}
          {screen === "settings" && <Settings onReprofile={() => setReprofile(true)} />}
        </div>
      </div>

      {/* 모바일 하단 탭바 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex md:hidden"
        style={{
          background: "var(--side)",
          boxShadow: "0 -2px 14px rgba(0,0,0,0.28)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {NAV.map((n) => {
          const on = navActive(n.key);
          return (
            <button
              key={n.key}
              onClick={() => setScreen(n.key)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold"
              style={{ color: on ? "#fff" : "var(--side-dim)" }}
            >
              <span className="text-base">{n.dot}</span>
              {n.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
