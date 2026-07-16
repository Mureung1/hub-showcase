"use client";
import { useState } from "react";
import { useApp } from "@/lib/client/store";
import { generateSituation } from "@/lib/client/api";
import type { Situation } from "@/lib/domain/types";

export default function NewSituation({
  onStart,
  onCancel,
}: {
  onStart: (s: Situation) => void;
  onCancel: () => void;
}) {
  const app = useApp();
  const [title, setTitle] = useState("");
  const [who, setWho] = useState("");
  const [goal, setGoal] = useState("");
  const [tension, setTension] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Situation | null>(null);

  async function design() {
    if (title.trim().length < 2) {
      setError("상황 제목을 입력해주세요.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const s = await generateSituation({ title: title.trim(), who, goal, tension });
      setPreview(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function saveAndStart() {
    if (!preview) return;
    app.addCustomSit(preview);
    onStart(preview);
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={onCancel} className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold" style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--sub)" }}>
          ← 뒤로
        </button>
        <h1 className="flex-1 text-xl font-extrabold">내 상황 만들기</h1>
      </div>
      <p className="mb-4 text-[13px]" style={{ color: "var(--sub)" }}>
        연습하고 싶은 상황을 적으면 AI가 관계·긴장·채점 기준을 설계해줍니다.
      </p>

      {!preview && (
        <div className="flex flex-col gap-3">
          <Field label="상황 제목 *" value={title} onChange={setTitle} placeholder="예: 팀장님께 휴가 하루 당겨쓰기 요청" />
          <Field label="상대는 누구인가요?" value={who} onChange={setWho} placeholder="예: 깐깐한 직속 팀장" />
          <Field label="하고 싶은 말/목적" value={goal} onChange={setGoal} placeholder="예: 개인 사정으로 예정보다 하루 일찍 쉬고 싶다" />
          <Field label="어려운 점" value={tension} onChange={setTension} placeholder="예: 이기적으로 보일까 걱정된다" />
          {error && <div className="rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "var(--bad-soft)", color: "var(--bad)" }}>{error}</div>}
          <button
            onClick={design}
            disabled={busy}
            className="rounded-xl py-3 text-[14.5px] font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "AI가 설계 중…" : "AI로 상황 설계하기"}
          </button>
        </div>
      )}

      {preview && (
        <div>
          <div className="rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
            <div className="mb-2 text-lg font-extrabold">{preview.title}</div>
            <PRow label="상대">{preview.counterpart}</PRow>
            <PRow label="목적">{preview.goal}</PRow>
            <PRow label="긴장 포인트">{preview.tension}</PRow>
            <PRow label="핵심 축">{preview.axis}</PRow>
            {preview.direction && (
              <div className="mt-3 rounded-lg p-3 text-[12.5px]" style={{ background: "var(--accent-soft)", color: "var(--ink)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--accent)" }}>&apos;적절&apos;의 방향</strong>
                <br />
                {preview.direction}
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={saveAndStart} className="flex-1 rounded-xl py-3 text-[14.5px] font-bold" style={{ background: "var(--good)", color: "#fff" }}>
              저장하고 훈련 시작
            </button>
            <button onClick={() => setPreview(null)} className="rounded-xl border px-4 py-3 text-[13.5px] font-semibold" style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--sub)" }}>
              다시 설계
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-bold">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3.5 py-2.5 text-[14px] outline-none"
        style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--ink)" }}
      />
    </label>
  );
}

function PRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-0.5 text-[13px]">
      <span className="shrink-0 font-semibold" style={{ color: "var(--sub)", minWidth: 60 }}>{label}</span>
      <span style={{ color: "var(--ink)" }}>{children}</span>
    </div>
  );
}
