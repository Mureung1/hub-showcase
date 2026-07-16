"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/client/store";
import { fetchMe, login, signup, logout } from "@/lib/client/api";

export default function AccountSection() {
  const app = useApp();
  const [email, setEmail] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [emailInput, setEmailInput] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMe().then((m) => {
      if (!alive) return;
      setEmail(m.user?.email ?? null);
      setAvailable(m.authAvailable);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function submit() {
    if (!emailInput.trim() || !pw) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fn = mode === "signup" ? signup : login;
      const user = await fn(emailInput.trim(), pw);
      setEmail(user?.email ?? emailInput.trim());
      setPw("");
      await app.reload(); // 소유자 변경 → 상태 재로딩
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doLogout() {
    setBusy(true);
    try {
      await logout();
      setEmail(null);
      await app.reload();
    } finally {
      setBusy(false);
    }
  }

  const card = "mb-4 rounded-2xl border p-4";
  const cardStyle = { background: "var(--surface)", borderColor: "var(--line)" } as const;

  if (!loaded) {
    return (
      <div className={card} style={cardStyle}>
        <div className="text-[12.5px]" style={{ color: "var(--sub)" }}>계정 정보 불러오는 중…</div>
      </div>
    );
  }

  if (!available) {
    return (
      <div className={card} style={cardStyle}>
        <div className="mb-1 text-[12px] font-extrabold" style={{ color: "var(--sub)" }}>계정</div>
        <div className="text-[12.5px]" style={{ color: "var(--sub)", lineHeight: 1.6 }}>
          지금은 이 기기에만 저장돼요. 서버(DB)가 연결되면 계정으로 로그인해 다른 기기에서도 이어집니다.
        </div>
      </div>
    );
  }

  if (email) {
    return (
      <div className={card} style={cardStyle}>
        <div className="mb-1 text-[12px] font-extrabold" style={{ color: "var(--sub)" }}>계정</div>
        <div className="mb-3 text-[13.5px] font-semibold">{email}</div>
        <div className="mb-3 text-[12px]" style={{ color: "var(--sub)" }}>기록이 계정에 저장돼 다른 기기에서도 이어집니다.</div>
        <button
          onClick={doLogout}
          disabled={busy}
          className="w-full rounded-xl border py-2.5 text-[13.5px] font-semibold"
          style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--sub)" }}
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className={card} style={cardStyle}>
      <div className="mb-1 text-[12px] font-extrabold" style={{ color: "var(--sub)" }}>계정</div>
      <div className="mb-3 text-[12.5px]" style={{ color: "var(--sub)", lineHeight: 1.6 }}>
        {mode === "signup" ? "가입하면" : "로그인하면"} 지금까지의 진척이 계정에 저장되어 다른 기기에서도 이어집니다.
      </div>
      <input
        value={emailInput}
        onChange={(e) => setEmailInput(e.target.value)}
        type="email"
        placeholder="이메일"
        className="mb-2 w-full rounded-lg border px-3 py-2.5 text-[14px] outline-none"
        style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--ink)" }}
      />
      <input
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        type="password"
        placeholder="비밀번호 (6자 이상)"
        className="w-full rounded-lg border px-3 py-2.5 text-[14px] outline-none"
        style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--ink)" }}
      />
      {error && <div className="mt-2 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "var(--bad-soft)", color: "var(--bad)" }}>{error}</div>}
      <button
        onClick={submit}
        disabled={busy}
        className="mt-3 w-full rounded-xl py-2.5 text-[13.5px] font-bold"
        style={{ background: "var(--accent)", color: "var(--accent-ink)", opacity: busy ? 0.6 : 1 }}
      >
        {busy ? "처리 중…" : mode === "signup" ? "회원가입" : "로그인"}
      </button>
      <button
        onClick={() => {
          setMode(mode === "signup" ? "login" : "signup");
          setError(null);
        }}
        className="mt-2 w-full text-center text-[12.5px] font-semibold"
        style={{ color: "var(--accent)" }}
      >
        {mode === "signup" ? "이미 계정이 있어요 — 로그인" : "계정이 없어요 — 회원가입"}
      </button>
    </div>
  );
}
