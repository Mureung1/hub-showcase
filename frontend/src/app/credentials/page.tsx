"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell, PageHead } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { FitMeter } from "@/components/ui/FitMeter";
import { CredentialRow } from "@/components/credentials/CredentialRow";
import { CredentialModal } from "@/components/credentials/CredentialModal";
import {
  ApiError,
  deleteCredential,
  getMe,
  listCredentials,
  recalculate,
} from "@/lib/data";
import type { Credential, CredentialType, Me } from "@/lib/types";

const SECTIONS: { type: CredentialType; title: string }[] = [
  { type: "career", title: "경력" },
  { type: "certificate", title: "자격증" },
  { type: "portfolio", title: "포트폴리오" },
];

/** F2 — 이력 관리 (디자인.md 6.2) */
export default function CredentialsPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [meRes, creds] = await Promise.all([getMe(), listCredentials()]);
      setMe(meRes);
      setCredentials(creds);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.replace("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  // 이력이 바뀌면 적합도를 다시 계산한다 — 목록 화면 순위에 반영되도록.
  async function afterChange() {
    await load();
    try {
      await recalculate();
    } catch {
      // 재계산 실패는 치명적이지 않다. 목록 화면에서 다시 시도 가능.
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await deleteCredential(id);
      await afterChange();
    } finally {
      setDeletingId(null);
    }
  }

  return (
      <AppShell>
        <PageHead
            title="내 이력"
            description="이력을 채울수록 적합도 계산이 정확해집니다."
            action={<Button onClick={() => setOpen(true)}>+ 이력 추가</Button>}
        />

        <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
          {/* 좌: 요약 */}
          <div className="flex flex-col gap-4">
            <Card className="text-center">
              <Avatar initials={me?.name.slice(0, 2) ?? ""} size={64} className="mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-strong">{me?.name ?? "…"}</h2>
              <p className="mb-4 text-xs text-muted">이력 {credentials.length}건</p>
              <div className="text-left">
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="text-muted">이력 완성도</span>
                  <strong className="text-strong">{me?.completeness ?? 0}%</strong>
                </div>
                <FitMeter score={me?.completeness ?? 0} label="이력 완성도" />
                <p className="mt-2 text-xs text-muted">
                  이력을 추가하면 매칭이 더 정확해집니다.
                </p>
              </div>
            </Card>
          </div>

          {/* 우: 상세 */}
          <Card>
            {SECTIONS.map((s, i) => {
              const items = credentials.filter((c) => c.type === s.type);
              return (
                  <section key={s.type} className={i > 0 ? "mt-7" : undefined}>
                    <div className="mb-3.5 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-strong">{s.title}</h2>
                      <Button variant="ghost" onClick={() => setOpen(true)}>
                        + 추가
                      </Button>
                    </div>
                    {items.length === 0 ? (
                        <p className="pb-2 text-[13px] text-muted">아직 등록한 {s.title} 이력이 없습니다.</p>
                    ) : (
                        items.map((c) => (
                            <CredentialRow
                                key={c.id}
                                credential={c}
                                onDelete={handleDelete}
                                deleting={deletingId === c.id}
                            />
                        ))
                    )}
                  </section>
              );
            })}
          </Card>
        </div>

        <CredentialModal open={open} onClose={() => setOpen(false)} onSaved={afterChange} />
      </AppShell>
  );
}