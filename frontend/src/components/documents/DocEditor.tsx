"use client";
import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/clsx";
import type { DocType } from "@/lib/types";

const TABS: { key: DocType; label: string }[] = [
  { key: "resume", label: "이력서" },
  { key: "letter", label: "자기소개서" },
];

/** 디자인.md 6.5 — 탭 + 편집 가능한 문서 + 지원 CTA */
export function DocEditor({
  docs,
  positionId,
}: {
  docs: Record<DocType, string>;
  positionId: string;
}) {
  const [tab, setTab] = useState<DocType>("resume");
  const [text, setText] = useState(docs);
  const [generating, setGenerating] = useState(false);

  /** 실제로는 POST /documents → 폴링. 지금은 지연만 흉내낸다. */
  function regenerate() {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 1400);
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="inline-flex rounded-xl bg-[#F1F2F6] p-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "rounded-[9px] px-5 py-2 text-[13px] font-semibold transition-colors",
                tab === t.key ? "bg-surface text-strong shadow-sm" : "text-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={regenerate} disabled={generating}>
          {generating ? "생성 중…" : "다시 생성"}
        </Button>
      </div>

      <Card>
        {generating ? (
          <div className="space-y-3 py-2" aria-live="polite">
            {[100, 92, 78, 96, 60].map((w, i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-line"
                style={{ width: `${w}%` }}
              />
            ))}
            <p className="pt-3 text-xs text-muted">포지션 요구조건에 맞춰 다시 쓰는 중입니다…</p>
          </div>
        ) : (
          <textarea
            value={text[tab]}
            onChange={(e) => setText({ ...text, [tab]: e.target.value })}
            aria-label={tab === "resume" ? "이력서 본문" : "자기소개서 본문"}
            className="min-h-[380px] w-full resize-y whitespace-pre-wrap bg-transparent leading-[1.75] text-body outline-none"
          />
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-5">
          <Badge tone="warning">⚠ AI 생성 초안입니다 — 사실 여부를 반드시 확인하세요</Badge>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary">저장</Button>
            <Link href={`/apply?position=${positionId}`}>
              <Button>지원하기</Button>
            </Link>
          </div>
        </div>
      </Card>
    </>
  );
}
