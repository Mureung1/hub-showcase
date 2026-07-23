"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/client/store";
import { fetchMe } from "@/lib/client/api";
import Login from "./screens/Login";
import Onboarding from "./screens/Onboarding";
import Home from "./screens/Home";
import TrainingModes from "./screens/TrainingModes";
import Chat from "./screens/Chat";
import Mail from "./screens/Mail";
import News from "./screens/News";
import History from "./screens/History";
import Stats from "./screens/Stats";
import Settings from "./screens/Settings";

export type ScreenKey = "home" | "history" | "stats" | "mail" | "news" | "chat" | "training" | "settings";

export default function AppShell() {
  const app = useApp();
  const [screen, setScreen] = useState<ScreenKey>("home");
  const [auth, setAuth] = useState({ checked: false, authed: false, available: false, guest: false });

  useEffect(() => {
    let alive = true;
    fetchMe().then((m) => {
      if (alive) setAuth((a) => ({ ...a, checked: true, authed: !!m.user, available: m.authAvailable }));
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!app.ready || !auth.checked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-on-surface-variant">불러오는 중…</div>
    );
  }

  if (auth.available && !auth.authed && !auth.guest) {
    return (
      <Login
        onAuthed={async () => {
          setAuth((a) => ({ ...a, authed: true }));
          await app.reload();
        }}
        onGuest={() => setAuth((a) => ({ ...a, guest: true }))}
      />
    );
  }

  if (!app.profile) {
    return <Onboarding onDone={() => setScreen("training")} />;
  }

  const nav = (k: ScreenKey) => setScreen(k);

  switch (screen) {
    case "home":
      return <Home nav={nav} />;
    case "history":
      return <History nav={nav} />;
    case "stats":
      return <Stats nav={nav} />;
    case "training":
      return <TrainingModes nav={nav} />;
    case "chat":
      return <Chat onExit={() => setScreen("home")} nav={nav} />;
    case "mail":
      return <Mail onExit={() => setScreen("home")} nav={nav} />;
    case "news":
      return <News onExit={() => setScreen("home")} nav={nav} />;
    case "settings":
      return <Settings nav={nav} />;
    default:
      return <Home nav={nav} />;
  }
}
