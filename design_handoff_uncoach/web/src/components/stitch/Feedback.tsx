"use client";
import type { ReactNode } from "react";
import { AXES } from "@/lib/domain/situations";
import type { Scores } from "@/lib/domain/types";

// 대화·메일·뉴스 훈련의 "점수 + 피드백" 영역을 하나의 시각 언어로 통일하는 공용 컴포넌트.

export interface Metric {
  label: string;
  hint?: string;
  pct: number;
  valueText: string;
  cls: string;
  bar: string;
}

/** 3축 루브릭(1 위험 · 2 무난 · 3 적절) → 막대 색/라벨 */
export function levelMeter(score: number) {
  if (score >= 3) return { label: "적절", cls: "text-tertiary", bar: "bg-tertiary", pct: 100 };
  if (score === 2) return { label: "무난", cls: "text-progress-orange", bar: "bg-progress-orange", pct: 66 };
  if (score === 1) return { label: "위험", cls: "text-error", bar: "bg-error", pct: 33 };
  return { label: "-", cls: "text-outline", bar: "bg-surface-container-highest", pct: 0 };
}

/** 채점 3축(맥락·격식·전략)을 공통 Metric[]으로 변환 */
export function axisMetrics(scores: Scores): Metric[] {
  return AXES.map((ax) => {
    const m = levelMeter(scores[ax.key]);
    return { label: ax.name, hint: `${ax.weight}%`, pct: m.pct, valueText: m.label, cls: m.cls, bar: m.bar };
  });
}

/** /10 지표(정확성·간결성·핵심정보)를 공통 Metric[]으로 변환 */
export function scoreMetrics(items: { label: string; value: number | null }[]): Metric[] {
  return items.map(({ label, value }) => {
    if (value == null) return { label, pct: 0, valueText: "--/10", cls: "text-outline", bar: "bg-surface-container-highest" };
    const cls = value >= 8 ? "text-tertiary" : value >= 5 ? "text-progress-orange" : "text-error";
    const bar = value >= 8 ? "bg-tertiary" : value >= 5 ? "bg-progress-orange" : "bg-error";
    return { label, pct: value * 10, valueText: `${value}/10`, cls, bar };
  });
}

/** 총점(0~100)도 막대와 같은 등급색을 쓴다 — 위험/무난/적절이 한눈에 읽히도록 */
export function totalTone(total: number) {
  if (total >= 80) return "text-tertiary";
  if (total >= 50) return "text-progress-orange";
  return "text-error";
}

/** 점수 카드 — 상단 종합 점수 + 지표 막대들 */
export function ScoreCard({ title = "평가 결과", total, metrics, empty }: { title?: string; total?: number | null; metrics: Metric[]; empty?: string }) {
  return (
    <div className="bg-white rounded-xl border border-border-light p-4 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-headline-md text-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">assessment</span> {title}
        </h3>
        {total != null && (
          <span className={"font-stats-number text-stats-number " + totalTone(total)}>
            {total}
            <span className="text-outline text-xs font-normal"> /100</span>
          </span>
        )}
      </div>
      {metrics.length === 0 && empty ? (
        <p className="font-body-md text-sm text-on-surface-variant">{empty}</p>
      ) : (
        <div className="space-y-3">
          {metrics.map((m) => (
            <div key={m.label}>
              <div className="flex justify-between font-label-sm text-label-sm mb-1">
                <span className="text-on-surface-variant">{m.label}{m.hint && <span className="text-outline"> · {m.hint}</span>}</span>
                <span className={"font-bold " + m.cls}>{m.valueText}</span>
              </div>
              <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                <div className={"h-1.5 rounded-full transition-all " + m.bar} style={{ width: `${m.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface RubricRow {
  num: string;
  name: string;
  desc: string;
  weight: number;
  /** [1점, 2점, 3점] 기준 문구 */
  levels: [string, string, string];
  /** 받은 점수 1~3 */
  score: number;
  reason?: string;
}

/**
 * 루브릭 채점표 — 축마다 1·2·3점 기준을 모두 펼쳐 보이고 받은 칸을 강조한다.
 * 점수만 보면 왜 그 점수인지 알 수 없어서, 기준 자체가 화면에 있어야 다음에 뭘 고칠지 알 수 있다.
 */
export function RubricTable({ rows, total, labels }: { rows: RubricRow[]; total: number; labels?: readonly string[] }) {
  return (
    <div className="bg-white rounded-xl border border-border-light shadow-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border-light">
        <h3 className="font-headline-md text-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">rule</span> 채점표
        </h3>
        <span className={"font-stats-number text-stats-number " + totalTone(total)}>
          {total}
          <span className="text-outline text-xs font-normal"> /100</span>
        </span>
      </div>
      <div className="divide-y divide-border-light">
        {rows.map((r) => {
          const m = levelMeter(r.score);
          return (
            <div key={r.name} className="p-4">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <h4 className="font-medium text-on-surface text-sm">
                  <span className="text-outline">{r.num}</span> {r.name}
                  <span className="text-outline font-normal"> · {r.weight}%</span>
                </h4>
                <span className={"font-bold text-sm shrink-0 " + m.cls}>{r.score}/3 {labels?.[r.score] ?? m.label}</span>
              </div>
              <p className="font-label-sm text-on-surface-variant mb-3">{r.desc}</p>
              <ol className="flex flex-col gap-1">
                {r.levels.map((text, i) => {
                  const on = i + 1 === r.score;
                  return (
                    <li
                      key={i}
                      className={
                        "flex gap-2 rounded-lg px-2 py-1.5 text-xs leading-relaxed " +
                        (on ? "bg-surface-container-low text-on-surface font-medium" : "text-outline")
                      }
                    >
                      <span className={"shrink-0 tabular-nums " + (on ? m.cls : "")}>{i + 1}점</span>
                      <span>{text}</span>
                    </li>
                  );
                })}
              </ol>
              {r.reason && <p className="mt-2 text-xs text-on-surface-variant leading-relaxed">{r.reason}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Accent = "primary" | "tertiary" | "orange" | "error";

/** 피드백 카드 — 좌측 컬러 액센트 + 아이콘 + 제목 + 본문 (+선택 액션) */
export function FeedbackItem({ accent = "primary", icon = "lightbulb", title, body, action }: { accent?: Accent; icon?: string; title?: string; body: string; action?: ReactNode }) {
  const bar = accent === "tertiary" ? "bg-tertiary" : accent === "orange" ? "bg-progress-orange" : accent === "error" ? "bg-error" : "bg-primary";
  const ic = accent === "tertiary" ? "text-tertiary" : accent === "orange" ? "text-progress-orange" : accent === "error" ? "text-error" : "text-primary";
  return (
    <div className="bg-white rounded-xl p-4 shadow-card border border-border-light relative overflow-hidden">
      <div className={"absolute left-0 top-0 bottom-0 w-1 " + bar} />
      <div className="flex items-start gap-3 pl-1">
        <span className={"material-symbols-outlined mt-0.5 " + ic}>{icon}</span>
        <div className="min-w-0">
          {title && <h4 className="font-medium text-on-surface text-sm mb-1">{title}</h4>}
          <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{body}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}

/** 피드백 영역 섹션 제목 */
export function FeedbackHeading({ children }: { children: ReactNode }) {
  return <h3 className="font-label-sm text-label-sm text-slate-muted uppercase tracking-wider pl-1">{children}</h3>;
}
