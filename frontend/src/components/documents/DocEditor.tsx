"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/clsx";
import { generateDoc, pollDoc, saveDoc } from "@/lib/data";
import type { DocType } from "@/lib/types";

const TABS: { key: DocType; label: string }[] = [
  { key: "resume", label: "이력서" },
  { key: "letter", label: "자기소개서" },
];

type DocState = {
  jobId: number | null;
  content: string;
  status: "idle" | "generating" | "ready" | "failed";
  error?: string;
};

const EMPTY: DocState = { jobId: null, content: "", status: "idle" };

/** 디자인.md 6.5 — 탭 + 편집 가능한 문서 + 지원 CTA */
export function DocEditor({ positionId }: { positionId: string }) {
  const [tab, setTab] = useState<DocType>("resume");
  const [docs, setDocs] = useState<Record<DocType, DocState>>({
    resume: EMPTY,
    letter: EMPTY,
  });
  const [saving, setSaving] = useState(false);

  const cur = docs[tab];

  const generate = useCallback(
      async (type: DocType) => {
        setDocs((d) => ({ ...d, [type]: { ...EMPTY, status: "generating" } }));
        try {
          const job = await generateDoc(Number(positionId), type);
          const content = await pollDoc(job.id);
          setDocs((d) => ({
            ...d,
            [type]: { jobId: job.id, content, status: "ready" },
          }));
        } catch (err) {
          setDocs((d) => ({
            ...d,
            [type]: {
              ...EMPTY,
              status: "failed",
              error: err instanceof Error ? err.message : "생성에 실패했습니다.",
            },
          }));
        }
      },
      [positionId],
  );

  // 탭에 아직 문서가 없으면 자동 생성 (진입 시 이력서, 탭 전환 시 자소서)
  useEffect(() => {
    if (docs[tab].status === "idle") void generate(tab);
  }, [tab, docs, generate]);

  async function handleSave() {
    if (cur.jobId == null) return;
    setSaving(true);
    try {
      await saveDoc(cur.jobId, cur.content);
    } finally {
      setSaving(false);
    }
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
          <Button
              variant="secondary"
              onClick={() => void generate(tab)}
              disabled={cur.status === "generating"}
          >
            {cur.status === "generating" ? "생성 중…" : "다시 생성"}
          </Button>
        </div>

        <Card>
          {cur.status === "generating" && (
              <div className="space-y-3 py-2" aria-live="polite">
                {[100, 92, 78, 96, 60].map((w, i) => (
                    <div
                        key={i}
                        className="h-4 animate-pulse rounded bg-line"
                        style={{ width: `${w}%` }}
                    />
                ))}
                <p className="pt-3 text-xs text-muted">
                  포지션 요구조건에 맞춰 쓰는 중입니다…
                </p>
              </div>
          )}

          {cur.status === "failed" && (
              <div className="flex flex-col items-start gap-3 py-4">
                <p className="text-sm">{cur.error}</p>
                <Button variant="secondary" onClick={() => void generate(tab)}>
                  다시 시도
                </Button>
              </div>
          )}

          {(cur.status === "ready" || cur.status === "idle") && (
              <textarea
                  value={cur.content}
                  onChange={(e) =>
                      setDocs((d) => ({
                        ...d,
                        [tab]: { ...d[tab], content: e.target.value },
                      }))
                  }
                  aria-label={tab === "resume" ? "이력서 본문" : "자기소개서 본문"}
                  className="min-h-[380px] w-full resize-y whitespace-pre-wrap bg-transparent leading-[1.75] text-body outline-none"
              />
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-5">
            <Badge tone="warning">⚠ AI 생성 초안입니다 — 사실 여부를 반드시 확인하세요</Badge>
            <div className="ml-auto flex gap-2">
              <Button
                  variant="secondary"
                  onClick={handleSave}
                  disabled={saving || cur.status !== "ready"}
              >
                {saving ? "저장 중…" : "저장"}
              </Button>
              <Link href={`/apply?position=${positionId}`}>
                <Button>지원하기</Button>
              </Link>
            </div>
          </div>
        </Card>
      </>
  );
}