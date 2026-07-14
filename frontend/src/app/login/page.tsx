import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { clsx } from "@/lib/clsx";

const STEPS = ["계정 만들기", "이력 입력하기", "추천 포지션 보기"];

/** F1 — 로그인 / 회원가입 (디자인.md 6.1) */
export default function LoginPage() {
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
          <h1 className="mb-1.5 text-[26px] font-bold tracking-tight text-strong">시작하기</h1>
          <p className="mb-6 text-muted">
            이메일로 계정을 만들면 바로 이력을 입력할 수 있습니다.
          </p>

          <Field label="이메일" type="email" defaultValue="seojun.kim@example.com" />
          <Field label="비밀번호" type="password" defaultValue="password123" />

          <Link href="/credentials" className="mt-2 block">
            <Button block>계정 만들고 이력 입력하기</Button>
          </Link>

          <p className="mt-4 text-center text-xs text-muted">
            이미 계정이 있나요?{" "}
            <Link href="/positions" className="font-semibold text-primary">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
