"use client";
import { useState } from "react";
import { useApp } from "@/lib/client/store";
import { ROLES, AGES, GENDERS } from "@/lib/domain/situations";

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const app = useApp();
  const [role, setRole] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const ready = role && age && gender;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-10 sm:max-w-2xl" style={{ animation: "ob-pop .4s ease both" }}>
      <div className="mb-6 text-center">
        <div className="text-3xl font-extrabold" style={{ letterSpacing: "-0.02em" }}>언코</div>
        <div className="mt-1.5 text-[13px]" style={{ color: "var(--sub)" }}>
          &apos;맞는 말&apos;이 아니라 &apos;맞는 상황의 말&apos;을 훈련합니다
        </div>
      </div>

      <div className="rounded-2xl border p-6" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <div className="mb-1 text-base font-extrabold">먼저, 당신을 알려주세요</div>
        <div className="mb-4 text-[12.5px]" style={{ color: "var(--sub)" }}>훈련 상황과 코칭 눈높이를 맞춥니다.</div>

        <div className="mb-2 text-[13px] font-bold">어떤 상황을 자주 겪나요?</div>
        <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ROLES.map(([title, desc]) => (
            <button
              key={title}
              onClick={() => setRole(title)}
              className="rounded-xl border px-3.5 py-3 text-left transition"
              style={{
                background: role === title ? "var(--accent-soft)" : "var(--bg)",
                borderColor: role === title ? "var(--accent)" : "var(--line)",
                borderWidth: 1.5,
              }}
            >
              <div className="text-[14px] font-bold">{title}</div>
              <div className="text-[12px]" style={{ color: "var(--sub)" }}>{desc}</div>
            </button>
          ))}
        </div>

        <div className="mb-2 text-[13px] font-bold">나이대</div>
        <div className="mb-4 flex flex-wrap gap-2">
          {AGES.map((a) => (
            <Pill key={a} on={age === a} onClick={() => setAge(a)}>{a}</Pill>
          ))}
        </div>

        <div className="mb-2 text-[13px] font-bold">성별</div>
        <div className="mb-6 flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <Pill key={g} on={gender === g} onClick={() => setGender(g)}>{g}</Pill>
          ))}
        </div>

        <button
          disabled={!ready}
          onClick={() => {
            if (!ready) return;
            app.saveProfile({ role: role!, age: age!, gender: gender!, goal: "사회 격식 전반" });
            onDone();
          }}
          className="w-full rounded-xl py-3.5 text-[15px] font-bold transition"
          style={{
            background: ready ? "var(--accent)" : "var(--line)",
            color: ready ? "var(--accent-ink)" : "var(--sub)",
            cursor: ready ? "pointer" : "default",
          }}
        >
          훈련 시작하기
        </button>
      </div>
    </div>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-4 py-2 text-[13px] font-semibold transition"
      style={{
        background: on ? "var(--accent)" : "var(--bg)",
        color: on ? "var(--accent-ink)" : "var(--ink)",
        border: `1.5px solid ${on ? "var(--accent)" : "var(--line)"}`,
      }}
    >
      {children}
    </button>
  );
}
