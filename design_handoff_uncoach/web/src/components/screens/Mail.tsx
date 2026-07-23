"use client";
import { useState } from "react";
import { useApp } from "@/lib/client/store";
import { AXES, LEVELS, SITUATIONS, personaOf, totalOf } from "@/lib/domain/situations";
import { scoreDraft, type ScoreResult } from "@/lib/client/api";
import type { Situation } from "@/lib/domain/types";
import type { ScreenKey } from "@/components/AppShell";

function recommend(role: string | undefined): Situation {
  const mine = SITUATIONS.filter((s) => !role || !s.roles || s.roles.includes(role));
  const pool = mine.length ? mine : SITUATIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function Mail({ onExit }: { onExit: () => void; nav: (k: ScreenKey) => void }) {
  const app = useApp();
  const [sit, setSit] = useState<Situation>(() => recommend(app.profile?.role));
  const persona = personaOf(sit);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [phase, setPhase] = useState<"write" | "scoring" | "result">("write");
  const [attempt, setAttempt] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reroll() {
    setSit(recommend(app.profile?.role));
    setSubject("");
    setBody("");
    setAttempt(null);
    setPhase("write");
  }

  async function send() {
    const d = body.trim();
    if (d.length < 5) return setError("메일 본문을 조금 더 써주세요.");
    setError(null);
    setPhase("scoring");
    try {
      const res = await scoreDraft({
        situationId: sit.id,
        customSit: app.customSits.some((c) => c.id === sit.id) ? sit : undefined,
        draft: d,
        emailSubject: subject,
        thread: [],
        profile: app.profile,
      });
      setAttempt(res);
      setPhase("result");
    } catch (e) {
      setError((e as Error).message);
      setPhase("write");
    }
  }

  function finish() {
    if (attempt) app.addSession(sit.id, attempt.scores);
    onExit();
  }

  const total = attempt ? totalOf(attempt.scores) : null;
  const ringCls = total == null ? "border-outline text-outline" : total >= 80 ? "border-tertiary text-tertiary" : total >= 55 ? "border-progress-orange text-progress-orange" : "border-error text-error";

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-on-background">
      <header className="bg-surface/80 backdrop-blur-md border-b border-border-light flex justify-between items-center px-4 md:px-8 h-16 shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <button aria-label="Back to Home" onClick={onExit} className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full"><span className="material-symbols-outlined">arrow_back</span></button>
          <div className="font-headline-md text-headline-md font-bold text-primary hidden md:block">uncoach-pi</div>
          <div className="flex-1 max-w-xl ml-4 relative bg-surface-container-low flex items-center px-4 h-10 rounded-full border border-border-light">
            <span className="material-symbols-outlined text-outline">search</span>
            <input type="text" placeholder="Search mail, coaching..." className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-body-md font-body-md text-on-surface ml-2" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full"><span className="material-symbols-outlined">notifications</span></button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full hidden sm:block"><span className="material-symbols-outlined">apps</span></button>
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold ml-2 border border-border-light">U</div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background">
        {/* 편집기 */}
        <section className="flex-[1.5] flex flex-col border-r border-border-light bg-surface-container-lowest h-full">
          <div className="h-14 border-b border-border-light flex items-center px-4 gap-2 bg-surface/50 overflow-x-auto">
            <button onClick={send} disabled={phase === "scoring"} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-primary hover:bg-surface-container-low disabled:opacity-60">
              <span className="material-symbols-outlined text-lg">send</span> <span className="hidden sm:inline">{phase === "scoring" ? "채점 중…" : "Send"}</span>
            </button>
            <button onClick={reroll} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-on-surface-variant hover:bg-surface-container-low">
              <span className="material-symbols-outlined text-lg">delete</span> <span className="hidden sm:inline">Discard</span>
            </button>
            <div className="w-px h-6 bg-border-light mx-2" />
            {["format_bold", "format_italic", "format_underlined"].map((i) => (
              <button key={i} className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container-low"><span className="material-symbols-outlined text-lg">{i}</span></button>
            ))}
            <div className="w-px h-6 bg-border-light mx-2" />
            {["attach_file", "link"].map((i) => (
              <button key={i} className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container-low"><span className="material-symbols-outlined text-lg">{i}</span></button>
            ))}
          </div>
          <div className="px-6 py-4 flex flex-col gap-3 border-b border-border-light">
            <div className="flex items-center gap-4">
              <span className="w-12 text-sm font-medium text-outline">To</span>
              <span className="flex-1 text-on-surface font-body-md">{persona.emoji} {persona.name} · {sit.title}</span>
            </div>
            <div className="w-full h-px bg-border-light/50" />
            <div className="flex items-center gap-4">
              <span className="w-12 text-sm font-medium text-outline">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} type="text" className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-on-surface font-body-md font-medium" placeholder="제목 입력…" />
            </div>
          </div>
          <div className="flex-1 p-6 overflow-y-auto flex flex-col">
            <div className="mb-3 text-sm text-on-surface-variant bg-primary/5 border border-primary/15 rounded-lg p-3">
              <b>상황:</b> {sit.tension} — <b>목표:</b> {sit.goal}
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full flex-1 resize-none border-none focus:ring-0 focus:outline-none bg-transparent text-body-md text-on-surface leading-relaxed"
              placeholder="메일 본문을 작성하세요…"
            />
            {error && <div className="mt-2 rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{error}</div>}
          </div>
        </section>

        {/* AI Coach */}
        <section className="flex-1 flex flex-col bg-[#F8FAFC] h-full overflow-y-auto">
          <div className="p-6 pb-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline-md text-headline-md font-bold text-slate-dark flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">psychology</span> AI Coach
              </h2>
              <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold tracking-wide uppercase">
                SCENARIO: {sit.rel || "MAIL"}
              </span>
            </div>

            {/* Overall */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] mb-6 border border-border-light relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-progress-orange to-primary" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label-sm font-label-sm text-secondary uppercase tracking-wider mb-1">Overall Effectiveness</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-display-lg font-display-lg text-slate-dark">{total ?? "--"}</span>
                    <span className="text-body-md text-outline">/ 100</span>
                  </div>
                </div>
                <div className={"w-16 h-16 rounded-full border-4 flex items-center justify-center " + ringCls}>
                  <span className="material-symbols-outlined text-3xl">trending_up</span>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant mt-4">
                {attempt ? attempt.coach : "메일을 작성하고 상단의 Send로 채점을 받아보세요."}
              </p>
            </div>

            {/* Key Feedback */}
            <div className="flex flex-col gap-4">
              <h3 className="font-body-lg text-body-lg font-semibold text-slate-dark mb-2">Key Feedback</h3>
              {!attempt ? (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-border-light text-sm text-on-surface-variant">
                  채점 후 맥락·격식·전략 3축 피드백이 여기에 표시됩니다.
                </div>
              ) : (
                <>
                  {AXES.map((ax) => {
                    const sc = attempt.scores[ax.key];
                    const good = sc >= 3;
                    const icon = good ? "check_circle" : sc === 2 ? "lightbulb" : "warning";
                    const c = good ? "text-tertiary" : sc === 2 ? "text-progress-orange" : "text-error";
                    const bar = good ? "bg-tertiary" : sc === 2 ? "bg-progress-orange" : "bg-error";
                    return (
                      <div key={ax.key} className="bg-white rounded-xl p-4 shadow-sm border border-border-light relative overflow-hidden">
                        <div className={"absolute left-0 top-0 bottom-0 w-1 " + bar} />
                        <div className="flex items-start gap-3">
                          <span className={"material-symbols-outlined mt-0.5 " + c}>{icon}</span>
                          <div>
                            <h4 className="font-medium text-on-surface text-sm mb-1">{ax.num} {ax.name} · {LEVELS[sc].label} {sc}/3</h4>
                            <p className="text-sm text-on-surface-variant leading-relaxed">{attempt.reasons?.[ax.key] || "—"}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {attempt.fix && (
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-border-light relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-progress-orange" />
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-progress-orange mt-0.5">lightbulb</span>
                        <div>
                          <h4 className="font-medium text-on-surface text-sm mb-1">Next Steps</h4>
                          <p className="text-sm text-on-surface-variant leading-relaxed">{attempt.fix}</p>
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => setBody((b) => b + "\n\n" + attempt.fix)} className="px-3 py-1.5 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20">Apply Suggestion</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <button onClick={finish} className="mt-2 w-full py-3 bg-primary text-white rounded-xl font-label-sm text-label-sm font-bold hover:bg-primary-container">
                    세션 저장하고 종료
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
