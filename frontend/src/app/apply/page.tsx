"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApiError, getPosition } from "@/lib/data";
import type { PositionDetail } from "@/lib/types";

type View =
    | { phase: "loading" }
    | { phase: "failed"; message: string }
    | { phase: "ready"; position?: PositionDetail };

/** F7 — 외부 지원 연결 (디자인.md 6.5) */
export default function ApplyPage({
                                    searchParams,
                                  }: {
  searchParams: Promise<{ position?: string }>;
}) {
  const { position: id } = use(searchParams);
  const router = useRouter();
  const [view, setView] = useState<View>(
      id ? { phase: "loading" } : { phase: "ready" },
  );

  const load = useCallback(async () => {
    if (!id) return;
    setView({ phase: "loading" });
    try {
      const position = await getPosition(id);
      setView({ phase: "ready", position });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.replace("/login");
        return;
      }
      setView({
        phase: "failed",
        message:
            err instanceof ApiError
                ? err.message
                : "백엔드에 연결하지 못했습니다. 서버가 8080 포트에서 실행 중인지 확인해 주세요.",
      });
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const back = {
    href: id ? `/documents/${id}` : "/positions",
    label: "문서로 돌아가기",
  };

  if (view.phase === "loading") {
    return (
        <AppShell back={back}>
          <Card className="mx-auto my-10 max-w-[520px] px-6 py-14 text-center">
            <p className="text-muted">포지션 정보를 불러오는 중입니다…</p>
          </Card>
        </AppShell>
    );
  }

  if (view.phase === "failed") {
    return (
        <AppShell back={back}>
          <Card className="mx-auto my-10 max-w-[520px] px-6 py-14 text-center">
            <h1 className="mb-2 text-[22px] font-bold text-strong">
              불러오지 못했습니다
            </h1>
            <p className="mb-6 text-muted">{view.message}</p>
            <div className="flex justify-center gap-2">
              <Link href="/positions">
                <Button variant="secondary">포지션 목록</Button>
              </Link>
              <Button onClick={() => void load()}>다시 시도</Button>
            </div>
          </Card>
        </AppShell>
    );
  }

  const position = view.position;
  const company = position?.company ?? "채용";
  const sourceUrl = position?.sourceUrl;

  return (
      <AppShell back={back}>
        <Card className="mx-auto my-10 max-w-[520px] px-6 py-14 text-center">
          <div className="mx-auto mb-4.5 grid h-15 w-15 place-items-center rounded-[18px] bg-primary-soft text-[26px] text-primary">
            ↗
          </div>
          <h1 className="mb-2 text-[22px] font-bold text-strong">
            {company} 채용 페이지로 이동합니다
          </h1>
          <p className="mb-6 text-muted">
            지원서 제출은 회사 채용 사이트에서 진행됩니다.
            <br />
            생성한 문서는 이전 화면에서 다시 확인할 수 있습니다.
          </p>
          <div className="flex justify-center gap-2">
            <Link href={back.href}>
              <Button variant="secondary">취소</Button>
            </Link>
            {sourceUrl ? (
                <a href={sourceUrl} target="_blank" rel="noreferrer noopener">
                  <Button>{company} 채용 페이지 열기</Button>
                </a>
            ) : null}
          </div>
          {sourceUrl ? null : (
              <p className="mt-5 text-xs text-muted">
                이 공고에는 원본 채용 페이지 주소가 없습니다.
              </p>
          )}
          <p className="mt-5 text-xs text-muted">
            MVP에서는 지원 완료 여부를 추적하지 않습니다.
          </p>
        </Card>
      </AppShell>
  );
}