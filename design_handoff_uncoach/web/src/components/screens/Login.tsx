"use client";
import { useState } from "react";
import { login, signup } from "@/lib/client/api";

export default function Login({ onAuthed, onGuest }: { onAuthed: () => void; onGuest: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !pw) return setError("이메일과 비밀번호를 입력해주세요.");
    if (!agree) return setError("서비스 약관에 동의해주세요.");
    setBusy(true);
    setError(null);
    try {
      await (mode === "signup" ? signup : login)(email.trim(), pw);
      onAuthed();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* 배경 셰이프 */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-tertiary-container/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-primary-container/20 blur-3xl" />

      <main className="min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-margin-page relative z-10 w-full max-w-7xl mx-auto">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-12 lg:gap-24">
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[24px]">auto_awesome</span>
              <span className="font-bold text-lg text-primary tracking-wide">언코</span>
            </div>
            <div className="mt-16 md:mt-0">
              <h1 className="font-display-lg text-display-lg text-slate-dark tracking-tight mb-4">언코</h1>
              <p className="font-body-lg text-body-lg text-slate-muted max-w-md">
                당신의 언어를 배우다, 언코
              </p>
            </div>
          </div>

          <div className="flex-1 w-full max-w-[480px]">
            <div className="rounded-[2rem] p-8 md:p-12 w-full bg-white/70 backdrop-blur-xl border border-white/60 shadow-pop">
              <h2 className="font-headline-lg text-headline-lg text-slate-dark mb-8">{mode === "login" ? "로그인" : "회원가입"}</h2>
              <div className="flex flex-col gap-5">
                <div className="relative">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-bright/50 border border-border-light rounded-xl px-4 py-4 text-slate-dark placeholder-slate-muted focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all"
                    placeholder="아이디"
                    type="text"
                  />
                </div>
                <div className="relative">
                  <input
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    className="w-full bg-surface-bright/50 border border-border-light rounded-xl px-4 py-4 pr-12 text-slate-dark placeholder-slate-muted focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all"
                    placeholder="비밀번호"
                    type={showPw ? "text" : "password"}
                  />
                  <button
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-muted hover:text-slate-dark transition-colors"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPw ? "visibility" : "visibility_off"}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="w-4 h-4 rounded accent-[var(--color-primary)] border-slate-300"
                  />
                  <label className="text-sm text-slate-muted" htmlFor="terms">
                    <span className="text-primary">이용약관</span>을 확인했으며 동의합니다
                  </label>
                </div>
                {error && <div className="rounded-xl bg-error-container text-on-error-container px-4 py-2.5 text-sm">{error}</div>}
                <button
                  onClick={submit}
                  disabled={busy}
                  className="w-full bg-primary hover:bg-primary-container text-white rounded-xl py-4 font-bold text-lg mt-2 transition-all shadow-pop active:scale-[0.98] disabled:opacity-60"
                  type="button"
                >
                  {busy ? "처리 중…" : mode === "login" ? "로그인" : "회원가입"}
                </button>
                <div className="flex justify-between items-center mt-6 text-sm">
                  <button type="button" className="text-slate-muted hover:text-primary transition-colors">
                    비밀번호를 잊으셨나요?
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "login" ? "signup" : "login");
                      setError(null);
                    }}
                    className="text-slate-muted hover:text-primary transition-colors"
                  >
                    {mode === "login" ? "회원가입" : "이미 계정이 있어요 — 로그인"}
                  </button>
                </div>
                <button type="button" onClick={onGuest} className="mt-2 text-center text-sm text-slate-muted hover:text-primary transition-colors">
                  게스트로 둘러보기
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
