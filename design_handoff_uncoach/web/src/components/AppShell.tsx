"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/client/store";
import { fetchMe } from "@/lib/client/api";
import type { Situation } from "@/lib/domain/types";
import Login from "./screens/Login";
import Onboarding from "./screens/Onboarding";
import Home from "./screens/Home";
import TrainingModes from "./screens/TrainingModes";
import ChatPicker from "./screens/ChatPicker";
import MailPicker from "./screens/MailPicker";
import NewsPicker from "./screens/NewsPicker";
import NewSituation from "./screens/NewSituation";
import Chat from "./screens/Chat";
import Mail from "./screens/Mail";
import News from "./screens/News";
import History from "./screens/History";
import Stats from "./screens/Stats";
import Settings from "./screens/Settings";

export type ScreenKey =
  | "home"
  | "history"
  | "stats"
  | "mail"
  | "news"
  | "chat"
  | "training"
  | "chatPicker"
  | "mailPicker"
  | "newsPicker"
  | "newSituation"
  | "settings";

export default function AppShell() {
  const app = useApp();
  const [screen, setScreen] = useState<ScreenKey>("home");
  const [sel, setSel] = useState<{ sit?: Situation; cat?: string }>({});
  const [newSitMedium, setNewSitMedium] = useState<"chat" | "email">("chat");
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
          // 계정 상태를 먼저 받아오고 나서 화면을 바꾼다. 순서가 반대면 아직 남아 있는
          // 로컬 blob으로 홈이 한 번 그려졌다가 온보딩으로 튄다.
          await app.reload();
          setAuth((a) => ({ ...a, authed: true }));
        }}
        onGuest={() => setAuth((a) => ({ ...a, guest: true }))}
      />
    );
  }

  if (!app.profile) {
    return <Onboarding onDone={() => setScreen("home")} />;
  }

  const nav = (k: ScreenKey) => setScreen(k);
  // 추천 카드에서 상황을 골라 바로 훈련으로 진입한다(픽커를 거치지 않음).
  const start = (sit: Situation) => {
    setSel({ sit });
    setScreen(sit.medium === "email" ? "mail" : "chat");
  };

  switch (screen) {
    case "home":
      return <Home nav={nav} start={start} />;
    case "history":
      return <History nav={nav} />;
    case "stats":
      return <Stats nav={nav} />;
    case "training":
      return <TrainingModes nav={nav} />;
    case "chatPicker":
      return <ChatPicker nav={nav} onPick={(sit) => { setSel({ sit }); setScreen("chat"); }} onCreate={() => { setNewSitMedium("chat"); setScreen("newSituation"); }} />;
    case "mailPicker":
      return <MailPicker nav={nav} onPick={(sit) => { setSel({ sit }); setScreen("mail"); }} onCreate={() => { setNewSitMedium("email"); setScreen("newSituation"); }} />;
    case "newsPicker":
      return <NewsPicker nav={nav} onPick={(cat) => { setSel({ cat }); setScreen("news"); }} />;
    case "newSituation":
      // 어느 픽커에서 들어왔는지에 따라 기본 매체와 '뒤로'가 정해진다.
      return <NewSituation nav={nav} defaultMedium={newSitMedium} onStart={start} />;
    case "chat":
      return <Chat situation={sel.sit} onExit={() => setScreen("home")} nav={nav} />;
    case "mail":
      return <Mail situation={sel.sit} onExit={() => setScreen("home")} nav={nav} />;
    case "news":
      return <News category={sel.cat} onExit={() => setScreen("home")} nav={nav} />;
    case "settings":
      return <Settings nav={nav} />;
    default:
      return <Home nav={nav} start={start} />;
  }
}
