"use client";
import { useState } from "react";
import { gradeSummary } from "@/lib/client/api";
import type { NewsPassage, SummaryResult } from "@/lib/domain/types";

type Phase = "read" | "grading" | "result";

export default function ContextReading({ passage, onExit }: { passage: NewsPassage; onExit: () => void }) {
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("read");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SummaryResult | null>(null);

  async function submit() {
    const text = draft.trim();
    if (text.length < 5) {
      setError("요약을 조금 더 써주세요 — 이 지문의 핵심을 한 문장으로.");
      return;
    }
    setError(null);
    setPhase("grading");
    try {
      const r = await gradeSummary({ text: passage.text, keyPoints: passage.keyPoints }, text);
      setResult(r);
      setPhase("result");
    } catch (e) {
      setError((e as Error).message);
      setPhase("read");
    }
  }

  const verdictColor =
    result?.verdict === "pass" ? "good" : result?.verdict === "partial" ? "warn" : "bad";

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onExit}
          className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold"
          style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--sub)" }}
        >
          ← 뒤로
        </button>
        <h1 className="flex-1 text-xl font-extrabold">맥락 읽기 — {passage.work}</h1>
      </div>

      <div className="rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <div className="mb-2 text-[15px] font-bold">{passage.scene}</div>
        <p className="text-[13.5px]" style={{ color: "var(--ink)", lineHeight: 1.7 }}>
          {passage.text}
        </p>
        {passage.sourceUrl ? (
          <a
            href={passage.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-[12px]"
            style={{ color: "var(--accent)" }}
          >
            출처: {passage.sourceTitle || passage.sourceUrl}
          </a>
        ) : (
          passage.sourceHint && (
            <div className="mt-3 text-[12px]" style={{ color: "var(--sub)" }}>
              {passage.sourceHint}
            </div>
          )
        )}
      </div>

      {phase !== "result" && (
        <div className="mt-4">
          <label className="mb-1 block text-[13px] font-bold">이 뉴스를 한 줄로 요약하면?</label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full rounded-xl border px-3.5 py-2.5 text-[14px] outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--ink)" }}
          />
          {error && (
            <div
              className="mt-2 rounded-lg px-3 py-2 text-[12.5px]"
              style={{ background: "var(--bad-soft)", color: "var(--bad)" }}
            >
              {error}
            </div>
          )}
          <button
            onClick={submit}
            disabled={phase === "grading"}
            className="mt-3 w-full rounded-xl py-3 text-[14.5px] font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)", opacity: phase === "grading" ? 0.6 : 1 }}
          >
            {phase === "grading" ? "채점 중…" : "맥락 확인하기"}
          </button>
        </div>
      )}

      {phase === "result" && result && (
        <div className="mt-4 rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
          <div
            className="mb-3 inline-block rounded-full px-3 py-1 text-[12px] font-extrabold"
            style={{ color: `var(--${verdictColor})`, background: `var(--${verdictColor}-soft)` }}
          >
            {result.verdict === "pass" ? "핵심을 잘 짚었어요" : result.verdict === "partial" ? "일부만 짚었어요" : "핵심을 놓쳤어요"}
          </div>
          {result.captured.length > 0 && (
            <div className="mb-2 text-[13px]" style={{ color: "var(--ink)" }}>
              <strong>짚은 점:</strong> {result.captured.join(" · ")}
            </div>
          )}
          {result.missed.length > 0 && (
            <div className="mb-2 text-[13px]" style={{ color: "var(--sub)" }}>
              <strong>놓친 점:</strong> {result.missed.join(" · ")}
            </div>
          )}
          <p className="mt-2 text-[13.5px]" style={{ color: "var(--ink)", lineHeight: 1.6 }}>
            {result.coach}
          </p>
          <button
            onClick={onExit}
            className="mt-4 w-full rounded-xl py-3 text-[14.5px] font-bold"
            style={{ background: "var(--good)", color: "#fff" }}
          >
            다른 뉴스 보기
          </button>
        </div>
      )}
    </div>
  );
}
