"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { clsx } from "@/lib/clsx";
import { login, signUp } from "@/lib/api";

const STEPS = ["계정 만들기", "이력 입력하기", "추천 포지션 보기"];

/** F1 — 로그인 / 회원가입 (디자인.md 6.1) */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("김서준");
  const [email, setEmail] = useState("seojun@hub.dev");  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      if (isSignup) {
        await signUp(email, password, name);
        router.push("/credentials");
      } else {
        await login(email, password);
        router.push("/positions");
      }
    } catch (err) {
      setError(
          err instanceof Error
              ? err.message
              : "요청을 처리하지 못했습니다. 백엔드가 실행 중인지 확인해 주세요.",
      );
      setBusy(false);
    }
  }

  return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="grid w-full max-w-[880px] overflow-hidden rounded-[20px] bg-surface shadow-modal md:grid-cols-[300px_1fr]">
          {/* 좌: 브랜드 패널 */}
          <div className="flex flex-col bg-[linear-gradient(165deg,#4C6FFF,#6B8AFF)] p-8 text-white md:p-10">
            <div className="mb-8 flex items-center gap-2.5 font-bold">
              <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-white/20">◎</span>
              적합도
            </div>
            <h2 className="text-xl font-bold leading-relaxed">
              이력을 넣으면
              <br />
              맞는 자리부터
              <br />
              보여드립니다.
            </h2>
            <ul className="mt-auto flex flex-col gap-3.5 pt-8">
              {STEPS.map((s, i) => (
                  <li
                      key={s}
                      className={clsx(
                          "flex items-center gap-2.5 text-[13px]",
                          i === 0 ? "font-semibold opacity-100" : "opacity-60",
                      )}
                  >
                <span
                    className={clsx(
                        "h-4.5 w-4.5 shrink-0 rounded-full border-2 border-white/70",
                        i === 0 && "bg-white",
                    )}
                />
                    {s}
                  </li>
              ))}
            </ul>
          </div>

          {/* 우: 폼 */}
          <div className="p-8 md:p-11">
            <h1 className="mb-1.5 text-[26px] font-bold tracking-tight text-strong">
              {isSignup ? "시작하기" : "다시 오셨네요"}
            </h1>
            <p className="mb-6 text-muted">
              {isSignup
                  ? "이메일로 계정을 만들면 바로 이력을 입력할 수 있습니다."
                  : "이메일과 비밀번호를 입력하면 추천 포지션으로 이동합니다."}
            </p>

            {isSignup && (
                <Field
                    label="이름"
                    type="text"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                />
            )}
            <Field
                label="이메일"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            />
            <Field
                label="비밀번호"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />

            {error && (
                <p className="mt-3 rounded-lg border border-current/10 px-3 py-2 text-[13px] text-danger">
                  {error}
                </p>
            )}

            <div className="mt-2">
              <Button block onClick={handleSubmit} disabled={busy}>
                {busy
                    ? "처리 중…"
                    : isSignup
                        ? "계정 만들고 이력 입력하기"
                        : "로그인하고 포지션 보기"}
              </Button>
            </div>

            <p className="mt-4 text-center text-xs text-muted">
              {isSignup ? "이미 계정이 있나요? " : "계정이 없나요? "}
              <button
                  type="button"
                  className="font-semibold text-primary"
                  onClick={() => {
                    setMode(isSignup ? "login" : "signup");
                    setError(null);
                  }}
              >
                {isSignup ? "로그인" : "계정 만들기"}
              </button>
            </p>
          </div>
        </div>
      </div>
  );
}