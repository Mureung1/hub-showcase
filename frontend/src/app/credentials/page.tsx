"use client";
import { useState } from "react";
import { AppShell, PageHead } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { FitMeter } from "@/components/ui/FitMeter";
import { CredentialRow } from "@/components/credentials/CredentialRow";
import { CredentialModal } from "@/components/credentials/CredentialModal";
import { CREDENTIALS, ME } from "@/lib/mock";
import type { CredentialType } from "@/lib/types";

const SECTIONS: { type: CredentialType; title: string }[] = [
  { type: "career", title: "경력" },
  { type: "certificate", title: "자격증" },
  { type: "portfolio", title: "포트폴리오" },
];

/** F2 — 이력 관리 (디자인.md 6.2) */
export default function CredentialsPage() {
  const [open, setOpen] = useState(false);

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
            <Avatar initials={ME.initials} size={64} className="mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-strong">{ME.name}</h2>
            <p className="mb-4 text-xs text-muted">{ME.role}</p>
            <div className="text-left">
              <div className="mb-1.5 flex justify-between text-[13px]">
                <span className="text-muted">이력 완성도</span>
                <strong className="text-strong">{ME.completeness}%</strong>
              </div>
              <FitMeter score={ME.completeness} label="이력 완성도" />
              <p className="mt-2 text-xs text-muted">
                포트폴리오를 추가하면 매칭이 더 정확해집니다.
              </p>
            </div>
          </Card>
        </div>

        {/* 우: 상세 */}
        <Card>
          {SECTIONS.map((s, i) => {
            const items = CREDENTIALS.filter((c) => c.type === s.type);
            return (
              <section key={s.type} className={i > 0 ? "mt-7" : undefined}>
                <div className="mb-3.5 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-strong">{s.title}</h2>
                  <Button variant="ghost" onClick={() => setOpen(true)}>
                    + 추가
                  </Button>
                </div>
                {items.map((c) => (
                  <CredentialRow key={c.id} credential={c} />
                ))}
              </section>
            );
          })}
        </Card>
      </div>

      <CredentialModal open={open} onClose={() => setOpen(false)} />
    </AppShell>
  );
}
