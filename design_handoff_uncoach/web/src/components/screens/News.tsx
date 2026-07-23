"use client";
import { useEffect, useState } from "react";
import { fetchNewsPassage, gradeSummary } from "@/lib/client/api";
import { NEWS_CATEGORIES } from "@/lib/domain/news-categories";
import type { NewsPassage, SummaryResult } from "@/lib/domain/types";
import type { ScreenKey } from "@/components/AppShell";

const METRIC = { pass: 9, partial: 6, miss: 3 } as const;

export default function News({ onExit }: { onExit: () => void; nav: (k: ScreenKey) => void }) {
  const [cat, setCat] = useState(NEWS_CATEGORIES[0].key);
  const [passage, setPassage] = useState<NewsPassage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"read" | "grading" | "result">("read");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(category: string) {
    setLoading(true);
    setLoadErr(null);
    setPassage(null);
    setResult(null);
    setPhase("read");
    setDraft("");
    try {
      setPassage(await fetchNewsPassage(category));
    } catch (e) {
      setLoadErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(cat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (!passage) return;
    const text = draft.trim();
    if (text.length < 5) return setError("요약을 조금 더 써주세요 — 핵심을 한 문장으로.");
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

  const metric = result ? METRIC[result.verdict] : null;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="fixed top-0 right-0 left-0 z-40 flex justify-between items-center px-8 h-16 bg-surface/80 backdrop-blur-md border-b border-border-light">
        <div className="flex items-center gap-4 flex-1">
          <button aria-label="Back to Home" onClick={onExit} className="p-2 -ml-2 text-on-surface-variant hover:bg-surface-container-low rounded-full"><span className="material-symbols-outlined">arrow_back</span></button>
          <div className="relative w-full max-w-md rounded-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input className="w-full bg-surface-container-low border-none rounded-full py-2 pl-12 pr-4 text-sm focus:ring-0 focus:outline-none" placeholder="Search news articles..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full relative"><span className="material-symbols-outlined">notifications</span><span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" /></button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full"><span className="material-symbols-outlined">apps</span></button>
        </div>
      </header>

      <main className="pt-24 px-4 md:px-8 pb-16 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">News Summary Training</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">기사를 읽고 핵심을 한 줄로 요약하세요. AI가 이해도를 평가합니다.</p>
            </div>
            <div className="hidden md:flex gap-3">
              <span className="px-3 py-1 bg-primary-fixed text-on-primary-fixed rounded-full font-label-sm text-label-sm flex items-center gap-1"><span className="material-symbols-outlined text-sm">trending_up</span> {NEWS_CATEGORIES.find((c) => c.key === cat)?.label}</span>
              <span className="px-3 py-1 bg-surface-container-high text-on-surface rounded-full font-label-sm text-label-sm flex items-center gap-1"><span className="material-symbols-outlined text-sm">timer</span> 15:00</span>
            </div>
          </div>

          {/* 카테고리 선택 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {NEWS_CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => { setCat(c.key); load(c.key); }}
                className={"px-3 py-1.5 rounded-full font-label-sm text-label-sm border transition-colors " + (cat === c.key ? "bg-primary text-white border-primary" : "bg-surface-container-lowest text-on-surface-variant border-border-light hover:bg-surface-container-low")}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-grid">
            {/* 기사 + 요약 */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <article className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-border-light overflow-hidden">
                <div className="h-40 w-full relative bg-gradient-to-br from-primary to-primary-container flex items-end p-6">
                  <span className="px-3 py-1 bg-error text-white text-xs font-bold uppercase tracking-wider rounded-md">{passage?.work || NEWS_CATEGORIES.find((c) => c.key === cat)?.label}</span>
                </div>
                <div className="p-padding-card">
                  {loading ? (
                    <div className="py-12 text-center text-on-surface-variant">최신 기사를 불러오는 중…</div>
                  ) : loadErr ? (
                    <div className="py-10 text-center">
                      <p className="text-error mb-3">{loadErr}</p>
                      <button onClick={() => load(cat)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">다시 시도</button>
                    </div>
                  ) : passage ? (
                    <>
                      <h3 className="font-headline-md text-headline-md text-on-surface mb-4 leading-tight">{passage.scene}</h3>
                      <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-border-light text-on-surface-variant">
                        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">article</span><span className="font-label-sm text-label-sm">{passage.sourceTitle || passage.sourceHint || "출처 미상"}</span></div>
                      </div>
                      <div className="font-body-md text-body-md text-on-surface space-y-4 leading-relaxed">
                        {passage.text.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}
                      </div>
                      {passage.sourceUrl && <a href={passage.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block font-label-sm text-label-sm text-primary hover:underline">원문 보기 →</a>}
                    </>
                  ) : null}
                </div>
              </article>

              <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-border-light p-padding-card">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-primary">edit_document</span>
                  <h4 className="font-headline-md text-headline-md text-on-surface text-lg">나의 요약</h4>
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant mb-4">작성 가이드: 핵심 내용(누가, 무엇을, 언제, 왜)을 포함하여 3문장 이내로 요약하세요.</p>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, 150))}
                  disabled={!passage || phase === "result"}
                  className="w-full h-32 bg-surface p-4 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:outline-none font-body-md text-body-md text-on-surface resize-none mb-4 disabled:opacity-60"
                  placeholder="여기에 기사 요약을 작성하세요..."
                />
                {error && <div className="mb-3 rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{error}</div>}
                <div className="flex justify-between items-center">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{draft.length} / 150 characters</span>
                  {phase === "result" ? (
                    <button onClick={() => load(cat)} className="bg-tertiary-container text-white px-6 py-2 rounded-lg font-label-sm text-label-sm font-bold shadow-md h-[44px]">다른 기사</button>
                  ) : (
                    <button onClick={submit} disabled={phase === "grading" || !passage} className="bg-primary text-white px-6 py-2 rounded-lg font-label-sm text-label-sm font-bold shadow-md hover:bg-surface-tint flex items-center gap-2 h-[44px] disabled:opacity-60">
                      {phase === "grading" ? "채점 중…" : "평가 받기"} <span className="material-symbols-outlined text-sm">send</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* AI Coach Feedback */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-white rounded-xl shadow-[0_8px_30px_rgba(15,23,42,0.08)] p-padding-card border border-border-light relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-fixed-dim rounded-full blur-3xl opacity-50" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-md"><span className="material-symbols-outlined">psychology</span></div>
                    <div>
                      <h4 className="font-headline-md text-headline-md text-on-surface text-lg">AI Coach Feedback</h4>
                      <p className="font-label-sm text-label-sm text-primary">{result ? "평가 완료" : "Awaiting submission..."}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {!result ? (
                      <div className="bg-surface/50 border border-border-light border-dashed rounded-lg p-6 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">analytics</span>
                        <p className="font-body-md text-body-md">요약을 제출하면 정확성·간결성·핵심 파악에 대한 피드백을 즉시 받습니다.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className={"inline-block rounded-full px-3 py-1 text-xs font-bold " + (result.verdict === "pass" ? "bg-tertiary-container text-white" : result.verdict === "partial" ? "bg-progress-orange/20 text-progress-orange" : "bg-error-container text-on-error-container")}>
                          {result.verdict === "pass" ? "핵심을 잘 짚었어요" : result.verdict === "partial" ? "일부만 짚었어요" : "핵심을 놓쳤어요"}
                        </div>
                        {result.captured.length > 0 && <p className="text-sm text-on-surface"><b className="text-tertiary">짚은 점:</b> {result.captured.join(" · ")}</p>}
                        {result.missed.length > 0 && <p className="text-sm text-on-surface-variant"><b className="text-progress-orange">놓친 점:</b> {result.missed.join(" · ")}</p>}
                        <p className="text-sm text-on-surface leading-relaxed">{result.coach}</p>
                      </div>
                    )}
                    <div className="mt-6">
                      <h5 className="font-label-sm text-label-sm text-on-surface font-bold uppercase mb-3">Evaluation Metrics</h5>
                      <ul className="space-y-3">
                        {["Accuracy", "Conciseness", "Key Details"].map((m) => (
                          <li key={m} className="flex items-center justify-between">
                            <span className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2"><span className={"w-2 h-2 rounded-full " + (metric ? "bg-primary" : "bg-border-light")} /> {m}</span>
                            <span className="font-label-sm text-label-sm text-slate-muted">{metric ?? "--"}/10</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
