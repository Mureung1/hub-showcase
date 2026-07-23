"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import { useApp } from "@/lib/client/store";
import { AXES, LEVELS, SITUATIONS, personaOf, splitBubbles } from "@/lib/domain/situations";
import { scoreDraft, type ScoreResult } from "@/lib/client/api";
import type { Situation, ThreadItem, Scores } from "@/lib/domain/types";
import type { ScreenKey } from "@/components/AppShell";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

function recommend(role: string | undefined, exclude?: string): Situation {
  const mine = SITUATIONS.filter((s) => (!role || !s.roles || s.roles.includes(role)) && s.id !== exclude);
  const pool = mine.length ? mine : SITUATIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function Chat({ onExit }: { onExit: () => void; nav: (k: ScreenKey) => void }) {
  const app = useApp();
  const [sit, setSit] = useState<Situation>(() => recommend(app.profile?.role));
  const persona = personaOf(sit);

  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<ThreadItem[]>(() =>
    sit.opener ? [{ from: "them", text: sit.opener }] : [],
  );
  const [times, setTimes] = useState<string[]>(() => (sit.opener ? [now()] : []));
  const [phase, setPhase] = useState<"write" | "scoring" | "result">("write");
  const [attempt, setAttempt] = useState<ScoreResult | null>(null);
  const [prevScores, setPrevScores] = useState<Scores | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [themTyping, setThemTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [thread, themTyping, phase]);

  function reroll() {
    const next = recommend(app.profile?.role, sit.id);
    setSit(next);
    setThread(next.opener ? [{ from: "them", text: next.opener }] : []);
    setTimes(next.opener ? [now()] : []);
    setDraft("");
    setAttempt(null);
    setPrevScores(null);
    setPhase("write");
    setSaved(false);
  }

  async function submit() {
    const d = draft.trim();
    if (d.length < 2) return setError("메시지를 조금 더 써주세요.");
    setError(null);
    setPhase("scoring");
    const sent: ThreadItem[] = [...thread, { from: "me", text: d }];
    setThread(sent);
    setTimes((t) => [...t, now()]);
    try {
      const res = await scoreDraft({
        situationId: sit.id,
        customSit: app.customSits.some((c) => c.id === sit.id) ? sit : undefined,
        draft: d,
        thread,
        profile: app.profile,
      });
      setPrevScores(attempt ? attempt.scores : null);
      setAttempt(res);
      setPhase("result");
      setSaved(false);
      setDraft("");
      if (res.counterpartReply) {
        const chunks = splitBubbles(res.counterpartReply);
        let cur = sent;
        for (let i = 0; i < chunks.length; i++) {
          setThemTyping(true);
          await sleep(420 + Math.min(chunks[i].length * 16, 1100));
          cur = [...cur, { from: "them", text: chunks[i] }];
          setThread(cur);
          setTimes((t) => [...t, now()]);
          setThemTyping(false);
          if (i < chunks.length - 1) await sleep(240);
        }
      }
    } catch (e) {
      setError((e as Error).message);
      setPhase("write");
      setThemTyping(false);
      setThread(thread);
    }
  }

  function finish() {
    if (attempt) app.addSession(sit.id, attempt.scores);
    onExit();
  }

  const empathy = attempt ? attempt.scores.register : 0; // 격식→공감 근사
  const solve = attempt ? attempt.scores.strategy : 0; // 전략→문제해결 근사

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-on-background">
      {/* 상단 바 */}
      <header className="bg-surface/80 backdrop-blur-md border-b border-border-light flex justify-between items-center px-6 md:px-8 h-16 shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <button aria-label="Back to Home" onClick={onExit} className="p-2 -ml-2 text-on-surface-variant hover:bg-surface-container-low rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="relative w-full max-w-md rounded-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-on-surface focus:ring-0 font-body-md text-body-md" placeholder="검색..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-2"><span className="material-symbols-outlined">notifications</span></button>
          <button className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-2"><span className="material-symbols-outlined">apps</span></button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden bg-background">
        {/* 대화 캔버스 */}
        <section className="flex-1 flex flex-col h-full bg-surface-bright relative min-w-0">
          <div className="h-16 px-6 border-b border-border-light flex items-center justify-between bg-white/80 backdrop-blur z-10 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-slate-200">{persona.emoji}</div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface text-lg">{persona.name} · {sit.title}</h2>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-tertiary-container rounded-full" />
                  <span className="font-label-sm text-label-sm text-slate-muted">현재 트레이닝 진행 중</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={reroll} title="다른 상황" className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full"><span className="material-symbols-outlined">refresh</span></button>
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full"><span className="material-symbols-outlined">more_vert</span></button>
            </div>
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex justify-center">
              <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-3 py-1 rounded-full text-xs">
                {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
            <div className="flex justify-center my-4">
              <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-lg max-w-lg text-center font-body-md text-body-md text-sm shadow-sm flex items-start gap-2">
                <span className="material-symbols-outlined text-base mt-0.5">smart_toy</span>
                <span><b>시나리오 시작:</b> {sit.background || sit.tension} — {sit.goal}</span>
              </div>
            </div>

            {thread.map((t, i) => {
              const them = t.from === "them";
              return them ? (
                <div key={i} className="flex items-end gap-3 max-w-3xl">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 shrink-0">{persona.emoji}</div>
                  <div className="bg-white border border-border-light rounded-2xl rounded-bl-none px-5 py-3 shadow-sm">
                    <p className="font-body-md text-body-md text-on-surface">{t.text}</p>
                    <span className="font-label-sm text-label-sm text-slate-muted text-xs mt-1 block">{times[i]}</span>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-end gap-3 max-w-3xl ml-auto justify-end">
                  <div className="bg-chat-bg-user rounded-2xl rounded-br-none px-5 py-3 shadow-sm">
                    <p className="font-body-md text-body-md text-on-surface">{t.text}</p>
                    <span className="font-label-sm text-label-sm text-slate-muted text-xs mt-1 block text-right">{times[i]}</span>
                  </div>
                </div>
              );
            })}

            {(themTyping || phase === "scoring") && (
              <div className="flex items-end gap-3 max-w-3xl">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 shrink-0">{persona.emoji}</div>
                <div className="bg-white border border-border-light rounded-2xl rounded-bl-none px-5 py-3 shadow-sm flex items-center gap-1 h-12">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-border-light shrink-0">
            {error && <div className="mb-2 rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{error}</div>}
            <div className="flex items-center gap-2 bg-surface-container-low rounded-2xl p-2 border border-border-light focus-within:ring-2 focus-within:ring-primary transition-all shadow-sm">
              <button className="p-2 text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined">add_circle</span></button>
              <button className="p-2 text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined">sentiment_satisfied</span></button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && phase !== "scoring" && !themTyping && submit()}
                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none font-body-md text-body-md text-on-surface py-3"
                placeholder="메시지를 입력하여 대응을 연습하세요..."
                type="text"
              />
              <button
                onClick={submit}
                disabled={phase === "scoring" || themTyping}
                className="p-3 bg-primary text-white rounded-xl hover:bg-primary-container transition-colors shadow-md flex items-center justify-center disabled:opacity-60"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </section>

        {/* AI 코칭 패널 */}
        <aside className="w-full md:w-96 lg:w-[400px] bg-surface-container-lowest border-l border-border-light flex flex-col h-full flex-shrink-0">
          <div className="flex border-b border-border-light bg-white shrink-0">
            <button className="flex-1 py-4 font-label-sm text-label-sm font-semibold text-primary border-b-2 border-primary text-center">AI 코칭</button>
            <button className="flex-1 py-4 font-label-sm text-label-sm font-medium text-on-surface-variant hover:bg-surface-container-low text-center">컨텍스트</button>
            <button className="flex-1 py-4 font-label-sm text-label-sm font-medium text-on-surface-variant hover:bg-surface-container-low text-center">가이드라인</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* 실시간 평가 */}
            <div className="bg-white rounded-xl border border-border-light p-4 shadow-sm">
              <h3 className="font-headline-md text-headline-md text-sm text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">assessment</span> 실시간 평가
              </h3>
              <div className="space-y-3">
                <Meter label="공감 능력" score={empathy} />
                <Meter label="문제 해결" score={solve} />
              </div>
            </div>

            {/* 피드백 */}
            <div className="space-y-3">
              <h3 className="font-label-sm text-label-sm text-slate-muted uppercase tracking-wider pl-1">피드백</h3>
              {!attempt ? (
                <div className="bg-surface-container-low border border-border-light rounded-xl p-4 text-sm text-on-surface-variant">
                  메시지를 보내면 맥락·격식·전략 3축 피드백이 여기에 표시됩니다.
                </div>
              ) : (
                <>
                  <div className="bg-secondary-fixed/50 border border-secondary-fixed-dim rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                    <div className="flex gap-3">
                      <span className="material-symbols-outlined text-primary mt-0.5">lightbulb</span>
                      <p className="font-body-md text-body-md text-sm text-on-surface leading-relaxed">
                        {attempt.coach}
                        {attempt.fix && <> <b>딱 하나: {attempt.fix}</b></>}
                      </p>
                    </div>
                  </div>
                  {AXES.map((ax) => {
                    const sc = attempt.scores[ax.key];
                    const c = sc >= 3 ? "text-tertiary" : sc === 2 ? "text-progress-orange" : "text-error";
                    const delta = prevScores ? sc - prevScores[ax.key] : 0;
                    return (
                      <div key={ax.key} className="bg-surface-container-low border border-border-light rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-body-md text-sm font-semibold text-on-surface">{ax.num} {ax.name}</span>
                          <span className={"font-label-sm text-label-sm font-bold " + c}>
                            {LEVELS[sc].label} {sc}/3{delta ? (delta > 0 ? ` ▲${delta}` : ` ▼${delta}`) : ""}
                          </span>
                        </div>
                        {attempt.reasons?.[ax.key] && (
                          <p className="font-body-md text-body-md text-sm text-on-surface-variant leading-relaxed">{attempt.reasons[ax.key]}</p>
                        )}
                      </div>
                    );
                  })}
                  {(attempt.best || AXES.reduce((t, a) => t + attempt.scores[a.key], 0) >= 8) && (
                    <button
                      onClick={() => {
                        app.addAsset(attempt.best || attempt.text, sit.id);
                        setSaved(true);
                      }}
                      disabled={saved}
                      className="w-full py-2.5 rounded-lg font-label-sm text-label-sm font-bold bg-tertiary-container text-white disabled:bg-tertiary-fixed disabled:text-tertiary"
                    >
                      {saved ? "✓ 잘 쓴 표현으로 저장됨" : "잘 쓴 표현으로 남기기"}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* 제안 패턴 */}
            <div>
              <h3 className="font-label-sm text-label-sm text-slate-muted uppercase tracking-wider pl-1 mb-2">제안하는 답변 패턴</h3>
              <div className="flex flex-wrap gap-2">
                {["정중한 사과하기", "환불 절차 안내", "교환 절차 안내"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setDraft((d) => (d ? d + " " : "") + p)}
                    className="px-3 py-1.5 bg-white border border-border-light rounded-lg font-body-md text-body-md text-sm text-on-surface hover:border-primary transition-all shadow-sm"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border-light bg-white shrink-0">
            <button
              onClick={finish}
              className="w-full py-3 bg-white border-2 border-primary text-primary rounded-xl font-label-sm text-label-sm font-bold hover:bg-primary hover:text-white transition-colors"
            >
              트레이닝 종료 및 결과 보기
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Meter({ label, score }: { label: string; score: number }) {
  const pct = (score / 3) * 100;
  const verdict = score >= 3 ? "Good" : score === 2 ? "Fair" : score === 1 ? "Needs Improvement" : "—";
  const barCls = score >= 3 ? "bg-tertiary" : score === 2 ? "bg-progress-orange" : "bg-error";
  const txtCls = score >= 3 ? "text-tertiary" : score === 2 ? "text-progress-orange" : "text-error";
  return (
    <div>
      <div className="flex justify-between font-label-sm text-label-sm mb-1">
        <span className="text-on-surface-variant">{label}</span>
        <span className={"font-bold " + txtCls}>{verdict}</span>
      </div>
      <div className="w-full bg-surface-container-highest rounded-full h-1.5">
        <div className={"h-1.5 rounded-full " + barCls} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
