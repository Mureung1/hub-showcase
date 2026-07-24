"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/client/store";
import { fetchNewsPassage, gradeSummary } from "@/lib/client/api";
import { NEWS_CATEGORIES } from "@/lib/domain/news-categories";
import { NEWS_AXES, NEWS_LEVEL_LABEL, toScores } from "@/lib/domain/news-score";
import { newsSid, totalOf } from "@/lib/domain/situations";
import type { NewsPassage, SummaryResult } from "@/lib/domain/types";
import type { ScreenKey } from "@/components/AppShell";
import ProfileChip from "@/components/stitch/ProfileChip";
import { FeedbackItem, RubricTable } from "@/components/stitch/Feedback";

const VERDICT_META = {
  pass: { label: "훌륭해요", cls: "text-tertiary", icon: "check_circle" },
  partial: { label: "조금 아쉬워요", cls: "text-progress-orange", icon: "info" },
  miss: { label: "핵심을 놓쳤어요", cls: "text-error", icon: "error" },
} as const;

export default function News({ category, onExit, nav }: { category?: string; onExit: () => void; nav: (k: ScreenKey) => void }) {
  void nav;
  const app = useApp();
  const cat = category ?? NEWS_CATEGORIES[0].key;
  const catLabel = NEWS_CATEGORIES.find((c) => c.key === cat)?.label ?? "뉴스";
  const [passage, setPassage] = useState<NewsPassage | null>(null);
  const [loadingPassage, setLoadingPassage] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  async function load(category: string) {
    setLoadingPassage(true);
    setLoadError(null);
    setResult(null);
    setSummary("");
    try {
      const p = await fetchNewsPassage(category);
      setPassage(p);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoadingPassage(false);
    }
  }

  useEffect(() => {
    load(cat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  async function submit() {
    if (!passage || grading || summary.trim().length < 2) return;
    setGrading(true);
    setGradeError(null);
    try {
      const r = await gradeSummary({ text: passage.text, keyPoints: passage.keyPoints }, summary);
      setResult(r);
    } catch (e) {
      setGradeError((e as Error).message);
    } finally {
      setGrading(false);
    }
  }

  // 뉴스 루브릭(3축 × 1~3)을 그대로 받아 저장 슬롯으로만 옮긴다 — 총점은 대화·메일과 같은 식.
  const vm = result ? VERDICT_META[result.verdict] : null;
  const scores = result ? toScores(result.scores) : null;
  const newsTotal = scores ? totalOf(scores) : null;
  const rows = result
    ? NEWS_AXES.map((ax) => ({ ...ax, score: result.scores[ax.key], reason: result.reasons[ax.key] }))
    : [];

  function finish() {
    if (scores && passage) app.addSession(newsSid(cat), scores, passage.sourceTitle || passage.work);
    onExit();
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      {/* TopAppBar */}
      <header className="fixed top-0 right-0 left-0 z-40 flex justify-between items-center px-4 md:px-8 h-16 bg-surface/80 backdrop-blur-md border-b border-border-light">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={onExit} className="p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="font-headline-md text-headline-md text-primary hidden md:block">뉴스 훈련</div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <ProfileChip name={app.profile?.name || app.profile?.role} />
        </div>
      </header>

      <main className="pt-24 px-4 md:px-8 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">뉴스 요약 훈련</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">기사를 읽고 핵심을 간결하게 요약해보세요. AI가 이해도를 평가합니다.</p>
            </div>
            <div className="hidden md:flex gap-3">
              <button onClick={() => load(cat)} className="px-3 py-1 bg-surface-container-high text-on-surface rounded-full font-label-sm text-label-sm flex items-center gap-1 hover:bg-surface-container-highest transition-colors"><span className="material-symbols-outlined text-[16px]">refresh</span> 새 기사</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-grid">
            {/* Left: Article */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <article className="bg-surface-container-lowest rounded-xl shadow-card border border-border-light overflow-hidden">
                <div className="p-padding-card">
                  {loadingPassage ? (
                    <div className="py-16 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl animate-spin mb-2 inline-block">progress_activity</span>
                      <p>최신 기사를 불러오는 중…</p>
                    </div>
                  ) : loadError ? (
                    <div className="py-12 text-center">
                      <p className="text-error mb-3">{loadError}</p>
                      <button onClick={() => load(cat)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold">다시 시도</button>
                    </div>
                  ) : passage ? (
                    <>
                      <span className="inline-block px-3 py-1 bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold rounded-md mb-3">{catLabel}</span>
                      <h3 className="font-headline-md text-headline-md text-on-surface mb-4 leading-tight">{passage.sourceTitle || passage.work}</h3>
                      <div className="flex items-center gap-2 mb-6 pb-6 border-b border-border-light text-on-surface-variant flex-wrap">
                        <span className="material-symbols-outlined text-[16px]">newspaper</span>
                        <span className="font-label-sm text-label-sm">출처: {passage.sourceHint || "웹"}</span>
                        {passage.sourceUrl && <a href={passage.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline ml-1"><span className="material-symbols-outlined text-[16px]">open_in_new</span><span className="font-label-sm text-label-sm">원문 보기</span></a>}
                      </div>
                      <div className="font-body-md text-body-md text-on-surface space-y-4 leading-relaxed whitespace-pre-line">{passage.text}</div>
                    </>
                  ) : null}
                </div>
              </article>
            </div>

            {/* Right: Summary + AI Coach */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-surface-container-lowest rounded-xl shadow-card border border-border-light p-padding-card">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-primary">edit_document</span>
                  <h4 className="font-headline-md text-lg text-on-surface">요약</h4>
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant mb-4">작성 가이드: 핵심 내용(누가, 무엇을, 언제, 왜)을 포함하여 3문장 이내로 요약하세요.</p>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value.slice(0, 150))}
                  disabled={!passage || loadingPassage}
                  className="w-full h-32 bg-surface p-4 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-body-md text-on-surface resize-none mb-4 focus:outline-none disabled:opacity-60"
                  placeholder="여기에 기사 요약을 작성하세요..."
                />
                <div className="flex justify-between items-center">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{summary.length} / 150자</span>
                  <button onClick={submit} disabled={grading || !passage || summary.trim().length < 2} className="bg-primary text-white px-6 py-2 rounded-lg font-label-sm text-label-sm font-bold shadow-card hover:bg-surface-tint transition-colors flex items-center gap-2 h-[44px] disabled:opacity-60">{grading ? "평가 중…" : "제출하기"}<span className="material-symbols-outlined text-[16px]">send</span></button>
                </div>
                {gradeError && <p className="mt-3 text-sm text-error">{gradeError}</p>}
              </div>

              {/* AI 코치 (공용 통일) */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-card"><span className="material-symbols-outlined">psychology</span></div>
                <div>
                  <h4 className="font-headline-md text-lg text-on-surface">AI 코치</h4>
                  {result && <p className={"font-label-sm text-label-sm font-bold " + vm!.cls}>{vm!.label}</p>}
                </div>
              </div>

              {result && newsTotal != null ? (
                <RubricTable rows={rows} total={newsTotal} labels={NEWS_LEVEL_LABEL} />
              ) : (
                <div className="bg-white rounded-xl border border-border-light shadow-card p-4">
                  <h3 className="font-headline-md text-sm text-on-surface flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[20px]">rule</span> 채점표
                  </h3>
                  <p className="font-body-md text-sm text-on-surface-variant mb-3">요약을 제출하면 아래 세 축을 각각 1~3점으로 채점합니다.</p>
                  <ul className="flex flex-col gap-2">
                    {NEWS_AXES.map((ax) => (
                      <li key={ax.key} className="text-xs">
                        <span className="font-medium text-on-surface">{ax.num} {ax.name}</span>
                        <span className="text-outline"> · {ax.weight}%</span>
                        <p className="text-on-surface-variant mt-0.5">{ax.desc}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result && (
                <div className="flex flex-col gap-3">
                  <FeedbackItem accent="primary" icon="lightbulb" body={result.coach} />
                  {result.captured.length > 0 && (
                    <FeedbackItem accent="tertiary" icon="check_circle" title="잘 담은 핵심" body={"• " + result.captured.join("\n• ")} />
                  )}
                  {result.missed.length > 0 && (
                    <FeedbackItem accent="orange" icon="priority_high" title="놓친 핵심" body={"• " + result.missed.join("\n• ")} />
                  )}
                  <button onClick={finish} className="w-full mt-1 py-3 bg-white border-2 border-primary text-primary rounded-xl font-label-sm text-label-sm font-bold hover:bg-primary hover:text-white transition-colors">세션 마치기</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
