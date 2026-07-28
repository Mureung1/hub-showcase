"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useApp } from "@/lib/client/store";
import { AXES } from "@/lib/domain/situations";
import { MAIL_SITS } from "@/lib/domain/demo-sits";
import { scoreDraft, type ScoreResult } from "@/lib/client/api";
import type { Situation } from "@/lib/domain/types";
import type { ScreenKey } from "@/components/AppShell";
import ProfileChip from "@/components/stitch/ProfileChip";
import { ScoreCard, RubricTable, FeedbackItem, FeedbackHeading, DemoBadge, axisMetrics, situationRubricRows } from "@/components/stitch/Feedback";

const DEFAULT_BODY = `안녕하세요, 담당자님.\n\n진행 중인 프로젝트 일정에 대해 안내드립니다.\n\n초기 단계에서 예상치 못한 지연이 있었으나, 최종 납기에는 영향이 없도록 조치하고 있습니다.\n\n자세한 내용은 내일 다시 공유드리겠습니다.\n\n감사합니다.`;

export default function Mail({ situation, onExit, nav }: { situation?: Situation; onExit: () => void; nav: (k: ScreenKey) => void }) {
  void nav;
  const app = useApp();
  const sit = situation ?? MAIL_SITS[0];
  const [subject, setSubject] = useState(() => (sit.id === "mail-delay" ? "프로젝트 일정 안내" : sit.title));
  const [body, setBody] = useState(() => (sit.id === "mail-delay" ? DEFAULT_BODY : ""));
  const [attempt, setAttempt] = useState<ScoreResult | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // 본문 칸을 내용만큼 늘린다. 고정 높이로 두면 칸 안에서 스크롤돼, 긴 메일을 쓸 때
  // 방금 쓴 문장만 보이고 앞 문단이 가려진다. 메일은 전체를 훑으며 고치는 글이라 치명적이다.
  // 넘치는 만큼은 바깥 열이 스크롤한다(실제 메일 작성 화면과 같은 방식).
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [body]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function evaluate() {
    if (busy || body.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await scoreDraft({ customSit: sit, draft: body, emailSubject: subject, thread: [] });
      setAttempt(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const total = attempt?.total ?? null;

  // 채점 때마다 기록하면 다시 쓸수록 XP가 불어난다. 대화 훈련과 같이 마칠 때 최종 1건만 남긴다.
  function finish() {
    if (attempt) app.addSession(sit.id, attempt.scores);
    onExit();
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      {/* TopAppBar */}
      <header className="bg-surface/80 backdrop-blur-md text-primary border-b border-border-light fixed top-0 right-0 left-0 z-40 flex justify-between items-center px-4 md:px-8 h-16">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={onExit} className="p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="font-headline-md text-headline-md text-primary hidden md:block">메일 훈련</div>
        </div>
        <div className="flex items-center gap-2">
          <ProfileChip name={app.profile?.name || app.profile?.role} />
        </div>
      </header>

      {/* 데스크톱은 두 열을 화면에 고정하고 각 열이 스크롤한다. 모바일은 세로로 쌓이므로
          화면 높이에 가두면 작성 칸이 손바닥만 해진다 — 페이지가 그냥 스크롤되게 둔다. */}
      {/* lg:flex-none이 있어야 h-[calc(...)]가 먹는다. 세로 flex 컨테이너 안에서 flex-1은
          flex-basis 0 + grow라 height를 덮어써서, 높이 고정이 실제로는 걸린 적이 없었다.
          본문이 길어지면 이 영역이 통째로 늘어나 페이지가 스크롤됐다. */}
      <div className="flex-1 lg:flex-none lg:h-[calc(100vh-4rem)] flex flex-col lg:flex-row mt-16 lg:overflow-hidden bg-background">
        {/* Left: Editor */}
        <section className="flex-[1.5] flex flex-col border-r border-border-light bg-surface-container-lowest lg:h-full relative z-10 ">
          <div className="h-14 border-b border-border-light flex items-center px-4 gap-2 bg-surface/50 overflow-x-auto">
            <button onClick={evaluate} disabled={busy} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-60"><span className="material-symbols-outlined text-[20px]">send</span> <span className="hidden sm:inline">{busy ? "평가 중…" : "평가하기"}</span></button>
            <button onClick={() => { setBody(sit.id === "mail-delay" ? DEFAULT_BODY : ""); setAttempt(null); }} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"><span className="material-symbols-outlined text-[20px]">delete</span> <span className="hidden sm:inline">지우기</span></button>
            <span className="ml-auto font-label-sm text-label-sm text-outline whitespace-nowrap">{body.trim().length}자</span>
          </div>
          <div className="px-6 py-4 flex flex-col gap-3 border-b border-border-light">
            <div className="flex items-center gap-4">
              <span className="w-16 shrink-0 text-sm font-medium text-outline">받는 사람</span>
              <p className="flex-1 text-on-surface font-body-md truncate">{sit.counterpart || sit.rel || "상대"}</p>
            </div>
            <div className="w-full h-px bg-border-light/50" />
            <div className="flex items-center gap-4">
              <span className="w-16 shrink-0 text-sm font-medium text-outline">제목</span>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="제목을 입력하세요..." className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-on-surface font-body-md font-medium focus:outline-none" />
            </div>
          </div>
          {/* 넘치는 분량은 이 열이 스크롤한다 — 본문 칸 자체에는 스크롤바가 생기지 않는다. */}
          <div className="flex-1 p-6 overflow-y-auto">
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={1}
              className="w-full min-h-[22rem] resize-none overflow-hidden border-none focus:ring-0 bg-transparent text-body-md text-on-surface leading-relaxed focus:outline-none"
              placeholder="여기에 이메일을 작성하세요..."
            />
          </div>
        </section>

        {/* Right: AI Coaching */}
        <section className="flex-1 flex flex-col lg:h-full lg:overflow-y-auto" style={{ background: "#F8FAFC" }}>
          <div className="p-6 pb-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline-md text-headline-md text-slate-dark flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">psychology</span>
                AI 코치
              </h2>
              <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold tracking-wide">시나리오: {sit.title}</span>
            </div>

            {/* 종합 점수 (공용) — 상황별 루브릭이 있으면 축별 1·2·3점 기준을 펼친 채점표로 */}
            {attempt?.demo && <DemoBadge />}
            {attempt && sit.rubric ? (
              <RubricTable rows={situationRubricRows(sit.rubric, attempt.scores, attempt.reasons)} total={attempt.total} />
            ) : (
              <ScoreCard
                title="종합 점수"
                total={total}
                metrics={attempt ? axisMetrics(attempt.scores) : []}
                empty="왼쪽 상단 '평가하기'를 눌러 이메일 초안을 평가받아 보세요."
              />
            )}

            {/* 피드백 (공용) */}
            <div className="flex flex-col gap-3 mt-6">
              <FeedbackHeading>핵심 피드백</FeedbackHeading>

              {error && <FeedbackItem accent="error" icon="error" body={error} />}
              {!attempt && !error && (
                <div className="bg-white rounded-xl p-6 shadow-card border border-border-light border-dashed text-center text-on-surface-variant text-sm">
                  평가를 실행하면 어조·명확성·다음 단계에 대한 상세 피드백이 여기에 표시됩니다.
                </div>
              )}

              {attempt && <FeedbackItem accent="primary" icon="lightbulb" body={attempt.coach} />}

              {/* 루브릭 채점표를 쓰면 축별 근거가 표 안에 이미 있으므로, 폴백(rubric 없음)일 때만 카드로 */}
              {attempt && !sit.rubric && AXES.map((ax) => {
                const reason = attempt.reasons[ax.key];
                if (!reason) return null;
                const good = attempt.scores[ax.key] >= 3;
                return (
                  <FeedbackItem
                    key={ax.key}
                    accent={good ? "tertiary" : "orange"}
                    icon={good ? "check_circle" : "warning"}
                    title={ax.name}
                    body={reason}
                  />
                );
              })}

              {attempt?.fix && (
                <FeedbackItem
                  accent="primary"
                  icon="auto_fix_high"
                  title="개선 제안"
                  body={attempt.fix}
                  action={
                    <button onClick={() => setBody((b) => b + "\n\n" + attempt.fix)} className="px-3 py-1.5 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors">제안 적용</button>
                  }
                />
              )}

              {attempt && (
                <button onClick={finish} className="w-full mt-1 py-3 bg-white border-2 border-primary text-primary rounded-xl font-label-sm text-label-sm font-bold hover:bg-primary hover:text-white transition-colors">세션 마치기</button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
