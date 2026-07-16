"use client";
import { useState } from "react";
import { useApp } from "@/lib/client/store";
import { AXES, LEVELS, personaOf, splitBubbles, totalOf } from "@/lib/domain/situations";
import { scoreDraft, type ScoreResult } from "@/lib/client/api";
import type { Situation, ThreadItem, Scores } from "@/lib/domain/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Train({
  situation: sit,
  onExit,
  onFinish,
}: {
  situation: Situation;
  onExit: () => void;
  onFinish: () => void;
}) {
  const app = useApp();
  const medium = sit.medium || "chat";
  const isEmail = medium === "email";
  const isPost = medium === "post";
  const persona = personaOf(sit);

  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [thread, setThread] = useState<ThreadItem[]>(
    sit.opener && medium === "chat" ? [{ from: "them", text: sit.opener }] : [],
  );
  const [phase, setPhase] = useState<"write" | "scoring" | "result">("write");
  const [attempt, setAttempt] = useState<ScoreResult | null>(null);
  const [prevScores, setPrevScores] = useState<Scores | null>(null);
  const [tries, setTries] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [themTyping, setThemTyping] = useState(false);

  async function submit() {
    const d = draft.trim();
    if (d.length < 2) {
      setError("메시지를 조금 더 써주세요.");
      return;
    }
    setError(null);
    setPhase("scoring");
    const sent: ThreadItem[] = [...thread, { from: "me", text: d, ...(isEmail ? { subject } : {}) }];
    setThread(sent);
    try {
      const res = await scoreDraft({
        situationId: sit.id,
        customSit: app.customSits.some((c) => c.id === sit.id) ? sit : undefined,
        draft: d,
        thread,
        profile: app.profile,
        emailSubject: subject,
      });
      setPrevScores(attempt ? attempt.scores : null);
      setAttempt(res);
      setPhase("result");
      setSaved(false);
      setTries((t) => t + 1);
      app.addSession(sit.id, res.scores);
      setDraft("");
      // 상대 답장 — 채팅은 여러 말풍선으로 뜸들이며, 그 외는 한 덩어리로.
      if (res.counterpartReply) {
        const chunks = medium === "chat" ? splitBubbles(res.counterpartReply) : [res.counterpartReply];
        let cur = sent;
        for (let i = 0; i < chunks.length; i++) {
          setThemTyping(true);
          await sleep(420 + Math.min(chunks[i].length * 16, 1100));
          const item: ThreadItem = isEmail
            ? { from: "them", text: chunks[i], subject: subject ? "Re: " + subject : "회신" }
            : { from: "them", text: chunks[i] };
          cur = [...cur, item];
          setThread(cur);
          setThemTyping(false);
          if (i < chunks.length - 1) await sleep(260);
        }
      }
    } catch (e) {
      setError((e as Error).message);
      setPhase("write");
      setThemTyping(false);
      setThread(thread); // 롤백
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={onExit} className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold" style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--sub)" }}>
          ← 상황 다시 고르기
        </button>
        <h1 className="flex-1 truncate text-lg font-extrabold">{sit.title}</h1>
      </div>

      {/* 상황 브리핑 */}
      <div className="mb-3 rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <Row label="상대">{sit.counterpart}</Row>
        <Row label="목적">{sit.goal}</Row>
        <Row label="긴장 포인트">{sit.tension}</Row>
        {sit.direction && (
          <div className="mt-3 rounded-lg p-3 text-[12.5px]" style={{ background: "var(--accent-soft)", color: "var(--ink)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--accent)" }}>이 관계에서 &apos;적절&apos;의 방향</strong>
            <br />
            {sit.direction}
          </div>
        )}
      </div>

      {sit.background && (
        <div className="mb-3 rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
          <div className="mb-2 text-[12px] font-extrabold" style={{ color: "var(--sub)" }}>📰 무슨 일이 있었나</div>
          <div className="text-[13.5px]" style={{ color: "var(--ink)", lineHeight: 1.75 }}>{sit.background}</div>
        </div>
      )}
      {sit.ctx && sit.sample && (
        <div className="mb-3 rounded-2xl border p-4" style={{ background: "var(--bad-soft)", borderColor: "var(--bad)" }}>
          <div className="mb-2 text-[12px] font-extrabold" style={{ color: "var(--bad)" }}>🔴 실제로 나갔던 원문 — 무엇이 문제일까요?</div>
          <div className="rounded-lg border p-3 text-[13.5px]" style={{ background: "var(--surface)", borderColor: "var(--line)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{sit.sample}</div>
        </div>
      )}

      {/* 대화/응답 스레드 */}
      {thread.length > 0 && (
        <div className="mb-3 flex flex-col gap-2.5 rounded-2xl border p-4" style={{ background: "var(--bg)", borderColor: "var(--line)" }}>
          {thread.map((t, i) => (
            <Bubble key={i} item={t} persona={persona} isPost={isPost} />
          ))}
          {(phase === "scoring" || themTyping) && (
            <div className="text-[12px]" style={{ color: "var(--sub)" }}>
              {persona.emoji} {persona.name} {phase === "scoring" ? "채점 중…" : "입력 중…"}
            </div>
          )}
        </div>
      )}

      {/* 작성 영역 */}
      {isEmail && (
        <>
          <div className="mb-2 flex items-center gap-2 rounded-lg border px-3 py-2" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
            <span className="text-[11.5px] font-semibold" style={{ color: "var(--sub)" }}>받는 사람</span>
            <span className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              <span>{persona.emoji}</span>
              {persona.name}
            </span>
          </div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="제목"
            className="mb-2 w-full rounded-lg border px-3 py-2.5 text-[14px] font-semibold outline-none"
            style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}
          />
        </>
      )}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={isPost || isEmail ? 6 : 3}
        placeholder={isEmail ? "메일 본문을 써보세요" : isPost ? "당신의 글로 다시 써보세요" : "메시지를 입력하세요"}
        className="w-full rounded-xl border px-3.5 py-3 text-[14px] outline-none"
        style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)", resize: "vertical" }}
      />
      {error && <div className="mt-2 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "var(--bad-soft)", color: "var(--bad)" }}>{error}</div>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          disabled={phase === "scoring" || themTyping}
          className="flex-1 rounded-xl py-3 text-[14.5px] font-bold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)", opacity: phase === "scoring" || themTyping ? 0.6 : 1 }}
        >
          {phase === "scoring" ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white"
                style={{ animation: "pc-spin .7s linear infinite" }}
              />
              채점 중…
            </span>
          ) : tries > 0 ? (
            "다시 써서 채점 받기"
          ) : isPost ? (
            "발행하고 채점 받기"
          ) : (
            "화용 채점 받기"
          )}
        </button>
        {phase === "result" && (
          <button onClick={onFinish} className="rounded-xl border px-4 py-3 text-[13.5px] font-semibold" style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--sub)" }}>
            세션 마치기
          </button>
        )}
      </div>

      {/* 결과 */}
      {phase === "result" && attempt && (
        <div className="mt-5">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold" style={{ color: "var(--accent)" }}>{totalOf(attempt.scores)}점</span>
            <span className="text-[12.5px]" style={{ color: "var(--sub)" }}>화용 총점 (100점 만점)</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {AXES.map((ax) => {
              const sc = attempt.scores[ax.key];
              const lvl = LEVELS[sc];
              const color = sc >= 3 ? "var(--good)" : sc === 2 ? "var(--warn)" : "var(--bad)";
              const delta = prevScores ? sc - prevScores[ax.key] : 0;
              return (
                <div key={ax.key} className="rounded-xl border p-3.5" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-bold">{ax.num} {ax.name}</span>
                    <span className="flex items-center gap-1.5">
                      {delta !== 0 && (
                        <span className="text-[11px] font-extrabold" style={{ color: delta > 0 ? "var(--good)" : "var(--bad)" }}>
                          {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
                        </span>
                      )}
                      <span className="rounded-full px-2 py-0.5 text-[11.5px] font-bold" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>{lvl.label} {sc}/3</span>
                    </span>
                  </div>
                  {/* 애니메이션 게이지 */}
                  <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--bg)" }}>
                    <div
                      key={`${tries}-${ax.key}`}
                      className="h-full rounded-full"
                      style={{ width: `${(sc / 3) * 100}%`, background: color, transition: "width .6s cubic-bezier(.2,.8,.2,1)" }}
                    />
                  </div>
                  {attempt.reasons?.[ax.key] && (
                    <div className="mt-1.5 text-[12.5px]" style={{ color: "var(--sub)", lineHeight: 1.6 }}>{attempt.reasons[ax.key]}</div>
                  )}
                </div>
              );
            })}
          </div>

          {attempt.coach && (
            <div className="mt-3 rounded-2xl border p-4" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
              <div className="mb-1.5 text-[12px] font-extrabold" style={{ color: "var(--accent)" }}>🎯 코치</div>
              <div className="text-[13.5px]" style={{ color: "var(--ink)", lineHeight: 1.7 }}>{attempt.coach}</div>
              {attempt.fix && <div className="mt-2 text-[13px]" style={{ color: "var(--ink)" }}><strong>딱 하나:</strong> {attempt.fix}</div>}
            </div>
          )}

          {(attempt.best || totalOf(attempt.scores) >= 80) && (
            <button
              onClick={() => {
                app.addAsset(attempt.best || attempt.text, sit.id);
                setSaved(true);
              }}
              disabled={saved}
              className="mt-3 w-full rounded-xl py-3 text-[13.5px] font-bold"
              style={{ background: saved ? "var(--good-soft)" : "var(--good)", color: saved ? "var(--good)" : "#fff" }}
            >
              {saved ? "✓ 궤적에 저장됨" : "잘 쓴 표현으로 남기기"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-0.5 text-[13px]">
      <span className="shrink-0 font-semibold" style={{ color: "var(--sub)", minWidth: 64 }}>{label}</span>
      <span style={{ color: "var(--ink)" }}>{children}</span>
    </div>
  );
}

function Bubble({
  item,
  persona,
  isPost,
}: {
  item: ThreadItem;
  persona: { emoji: string; name: string; color: string };
  isPost: boolean;
}) {
  const them = item.from === "them";
  // 게시형은 좌우 정렬 대신 전체 폭 카드로 (내가 발행한 글 / 여론 반응)
  if (isPost) {
    return (
      <div className="rounded-xl border p-3" style={{ background: them ? "var(--surface)" : "var(--accent-soft)", borderColor: "var(--line)" }}>
        <div className="mb-1 text-[11px] font-bold" style={{ color: them ? persona.color : "var(--accent)" }}>
          {them ? `💬 여론 반응` : `📢 내가 발행한 글`}
        </div>
        <div className="text-[13.5px]" style={{ color: "var(--ink)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.text}</div>
      </div>
    );
  }
  return (
    <div className={`flex ${them ? "justify-start" : "justify-end"}`}>
      <div
        className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13.5px]"
        style={{
          background: them ? "var(--surface)" : "var(--accent)",
          color: them ? "var(--ink)" : "var(--accent-ink)",
          border: them ? "1px solid var(--line)" : "none",
          lineHeight: 1.6,
        }}
      >
        {them && <div className="mb-0.5 text-[11px] font-bold" style={{ color: persona.color }}>{persona.emoji} {persona.name}</div>}
        {item.subject && <div className="mb-1 text-[12px] font-bold">✉ {item.subject}</div>}
        {item.text}
      </div>
    </div>
  );
}
