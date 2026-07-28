"use client";
import { useRef, useState } from "react";
import { useApp } from "@/lib/client/store";
import { splitBubbles, personaOf } from "@/lib/domain/situations";
import { CHAT_COMPLAINT_SIT } from "@/lib/domain/demo-sits";
import { scoreDraft, type ScoreResult } from "@/lib/client/api";
import type { Situation, ThreadItem } from "@/lib/domain/types";
import type { ScreenKey } from "@/components/AppShell";
import ProfileChip from "@/components/stitch/ProfileChip";
import { ScoreCard, RubricTable, FeedbackItem, FeedbackHeading, DemoBadge, axisMetrics, situationRubricRows } from "@/components/stitch/Feedback";

// 제안 답변 패턴 — 누르면 예시 초안이 입력창에 채워진다.
const SUGGESTIONS: { label: string; draft: string }[] = [
  { label: "정중한 사과", draft: "먼저, 불편을 드려 대단히 죄송합니다." },
  { label: "핵심 요구 확인", draft: "어떤 부분을 가장 우선으로 해결해 드리면 될지 알려주시겠어요?" },
  { label: "구체적 대안 제시", draft: "바로 새 제품으로 재발송하거나 전액 환불 중 원하시는 방법으로 처리해 드리겠습니다." },
];
const now = () => new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });

interface Msg {
  from: "them" | "me";
  text: string;
  time: string;
}


export default function Chat({ situation, onExit, nav }: { situation?: Situation; onExit: () => void; nav: (k: ScreenKey) => void }) {
  void nav;
  const app = useApp();
  const sit = situation ?? CHAT_COMPLAINT_SIT;
  const persona = personaOf(sit);
  const opener = sit.opener || "안녕하세요, 잘 부탁드립니다.";
  const [messages, setMessages] = useState<Msg[]>([{ from: "them", text: opener, time: "10:24 AM" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const draft = input.trim();
    if (!draft || busy) return;
    const thread: ThreadItem[] = messages.map((m) => ({ from: m.from, text: m.text }));
    setMessages((cur) => [...cur, { from: "me", text: draft, time: now() }]);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await scoreDraft({ customSit: sit, draft, thread });
      setAttempt(res);
      const bubbles = splitBubbles(res.counterpartReply);
      for (const b of bubbles) {
        setMessages((cur) => [...cur, { from: "them", text: b, time: now() }]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
    }
  }

  function restart() {
    if (busy) return;
    setMessages([{ from: "them", text: opener, time: now() }]);
    setInput("");
    setAttempt(null);
    setError(null);
  }

  function finish() {
    if (attempt) app.addSession(sit.id, attempt.scores);
    onExit();
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      {/* TopAppBar */}
      <header className="fixed top-0 right-0 left-0 z-40 flex justify-between items-center px-4 md:px-8 h-16 bg-surface/80 backdrop-blur-md border-b border-border-light">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={onExit} className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="font-headline-md text-headline-md text-primary hidden md:block">대화 훈련</div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <ProfileChip name={app.profile?.name || app.profile?.role} />
        </div>
      </header>

      <main className="flex-1 pt-16 h-screen flex flex-col md:flex-row bg-background">
        {/* Center: Chat */}
        <section className="flex-1 flex flex-col h-full bg-surface-bright relative">
          <div className="h-16 px-6 border-b border-border-light flex items-center justify-between bg-white/80 backdrop-blur z-10 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-200 hidden sm:flex items-center justify-center text-xl">{persona.emoji}</div>
              <div>
                <h2 className="font-headline-md text-lg text-on-surface">{persona.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-tertiary-container rounded-full" />
                  <span className="font-label-sm text-label-sm text-slate-muted">현재 트레이닝 진행 중 · {sit.title}</span>
                </div>
              </div>
            </div>
            <button
              onClick={restart}
              disabled={busy}
              className="flex items-center gap-1 px-3 py-2 rounded-lg font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">restart_alt</span>
              <span className="hidden sm:inline">대화 다시 시작</span>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex justify-center">
              <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-3 py-1 rounded-full">{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
            <div className="flex justify-center my-4">
              <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-lg max-w-lg text-center font-body-md text-sm shadow-card flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] mt-0.5">smart_toy</span>
                <span><b>시나리오 시작:</b> {sit.title} — {sit.goal}</span>
              </div>
            </div>

            {messages.map((m, i) =>
              m.from === "them" ? (
                <div key={i} className="flex items-end gap-3 max-w-3xl">
                  <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center">{persona.emoji}</div>
                  <div className="bg-white border border-border-light rounded-xl rounded-bl-none px-5 py-3 shadow-card">
                    <p className="font-body-md text-body-md text-on-surface">{m.text}</p>
                    <span className="font-label-sm text-label-sm text-slate-muted mt-1 block">{m.time}</span>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-end gap-3 max-w-3xl ml-auto justify-end">
                  <div className="bg-chat-bg-user rounded-xl rounded-br-none px-5 py-3 shadow-card">
                    <p className="font-body-md text-body-md text-on-surface">{m.text}</p>
                    <span className="font-label-sm text-label-sm text-slate-muted mt-1 block text-right">{m.time}</span>
                  </div>
                </div>
              ),
            )}

            {busy && (
              <div className="flex items-end gap-3 max-w-3xl">
                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center">{persona.emoji}</div>
                <div className="bg-white border border-border-light rounded-xl rounded-bl-none px-5 py-3 shadow-card flex items-center gap-1 h-12">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-center">
                <div className="bg-error-container text-on-error-container px-4 py-2 rounded-lg text-sm max-w-md text-center">{error}</div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-border-light shrink-0">
            <div className="flex items-center gap-2 bg-surface-container-low rounded-xl p-2 border border-border-light focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all shadow-card">
              <button className="p-2 text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined">add_circle</span></button>
              <button className="p-2 text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined">sentiment_satisfied</span></button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder-slate-400 py-3 focus:outline-none"
                placeholder="메시지를 입력하여 대응을 연습하세요..."
                type="text"
              />
              <button onClick={send} disabled={busy} className="p-3 bg-primary text-white rounded-xl hover:bg-primary-fixed-variant transition-colors shadow-card flex items-center justify-center disabled:opacity-60"><span className="material-symbols-outlined">send</span></button>
            </div>
          </div>
        </section>

        {/* Right: AI Coaching */}
        <aside className="w-full md:w-96 lg:w-[400px] bg-surface-container-lowest border-l border-border-light flex flex-col h-full flex-shrink-0">
          <div className="flex border-b border-border-light bg-white shrink-0">
            <div className="flex-1 py-4 font-label-sm text-label-sm font-semibold text-primary border-b-2 border-primary text-center">AI 코칭</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* 실시간 평가 (공용) — 상황별 루브릭이 있으면 축별 1·2·3점 기준을 펼친 채점표로 */}
            {attempt?.demo && <DemoBadge />}
            {attempt && sit.rubric ? (
              <RubricTable rows={situationRubricRows(sit.rubric, attempt.scores, attempt.reasons)} total={attempt.total} />
            ) : (
              <ScoreCard
                title="실시간 평가"
                total={attempt ? attempt.total : null}
                metrics={attempt ? axisMetrics(attempt.scores) : []}
                empty="메시지를 보내면 맥락·격식·전략 3축을 실시간으로 평가합니다."
              />
            )}

            {/* 피드백 (공용) */}
            <div className="space-y-3">
              <FeedbackHeading>피드백</FeedbackHeading>
              {attempt ? (
                <>
                  <FeedbackItem accent="primary" icon="lightbulb" body={attempt.coach} />
                  {attempt.fix && (
                    <FeedbackItem
                      accent="orange"
                      icon="tips_and_updates"
                      title="이렇게 고쳐보세요"
                      body={attempt.fix + (attempt.best ? `\n\n모범 예시: ${attempt.best}` : "")}
                    />
                  )}
                </>
              ) : (
                <div className="bg-white border border-border-light border-dashed rounded-xl p-4 text-sm text-on-surface-variant text-center">아직 피드백이 없습니다. 첫 응답을 보내보세요.</div>
              )}
            </div>

            {/* Suggestions */}
            <div className="mt-6">
              <FeedbackHeading>제안하는 답변 패턴</FeedbackHeading>
              <div className="h-2" />
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s.label} onClick={() => setInput(s.draft)} title={s.draft} className="px-3 py-1.5 bg-white border border-border-light rounded-lg font-body-md text-sm text-on-surface hover:bg-surface-container-low hover:border-primary transition-all shadow-card">{s.label}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border-light bg-white shrink-0">
            <button onClick={finish} className="w-full py-3 bg-white border-2 border-primary text-primary rounded-xl font-label-sm text-label-sm font-bold hover:bg-primary hover:text-white transition-colors">세션 마치기</button>
          </div>
        </aside>
      </main>
    </div>
  );
}
