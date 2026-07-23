"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FitMeter } from "@/components/ui/FitMeter";
import { RequirementRow } from "@/components/positions/RequirementRow";
import { AdviceList } from "@/components/positions/AdviceList";
import { fitLabel, fitTone } from "@/lib/fit";
import { ApiError, getPosition } from "@/lib/data";
import type { PositionDetail } from "@/lib/types";

type View =
    | { phase: "loading" }
    | { phase: "failed"; message: string }
    | { phase: "missing" }
    | { phase: "ready"; position: PositionDetail };

/** F5 — 포지션 상세 + 방향 제시 (디자인.md 6.4) */
export default function PositionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [view, setView] = useState<View>({ phase: "loading" });

  const load = useCallback(async () => {
    setView({ phase: "loading" });
    try {
      const position = await getPosition(id);
      setView(position ? { phase: "ready", position } : { phase: "missing" });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.replace("/login");
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        setView({ phase: "missing" });
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

  const back = { href: "/positions", label: "포지션 목록" };

  if (view.phase === "loading") {
    return (
        <AppShell back={back}>
          <div className="h-40 animate-pulse rounded-xl border border-current/10 bg-current/[0.03]" />
        </AppShell>
    );
  }

  if (view.phase === "missing") {
    return (
        <AppShell back={back}>
          <Card className="px-6 py-14 text-center">
            <p className="text-strong">이 포지션의 적합도 계산 결과가 없습니다.</p>
            <p className="mt-2 text-[13px] text-muted">
              목록에서 적합도를 계산한 뒤 다시 열어 주세요.
            </p>
            <Link href="/positions" className="mt-5 inline-block">
              <Button variant="secondary">포지션 목록으로</Button>
            </Link>
          </Card>
        </AppShell>
    );
  }

  if (view.phase === "failed") {
    return (
        <AppShell back={back}>
          <div className="flex flex-col items-start gap-3 rounded-lg border border-current/10 p-6">
            <p className="text-sm">{view.message}</p>
            <Button variant="secondary" onClick={() => void load()}>
              다시 불러오기
            </Button>
          </div>
        </AppShell>
    );
  }

  const position = view.position;
  const tone = fitTone(position.fitScore);
  const required = position.requirements.filter((r) => r.required);
  const preferred = position.requirements.filter((r) => !r.required);
  const met = (rs: typeof required) => rs.filter((r) => r.fulfillment >= 1).length;

  // 가중합(보정 전) → 최종 점수. 두 값의 차이가 게이트 감점이다.
  const rawScore = position.fulfillmentSum * 100;
  const penalty = Math.round(rawScore - position.fitScore);
  const unmetRequired = required.filter((r) => r.fulfillment < 1);

  return (
      <AppShell back={back}>
        <div className="mb-6 flex items-center gap-3.5">
        <span className="grid h-13 w-13 place-items-center rounded-xl bg-primary-soft font-bold text-primary">
          {position.company.slice(0, 2)}
        </span>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-strong">{position.title}</h1>
            <p className="mt-1 text-muted">
              {position.company} · {position.location} · 경력 {position.experience} · 수집일{" "}
              {position.collectedAt}
            </p>
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-5">
            <Card>
              <div className="mb-3.5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-strong">요구조건별 충족도</h2>
                <span className="text-xs text-muted">가중치 × 충족도 = 기여 점수</span>
              </div>
              {position.requirements.map((r) => (
                  <RequirementRow key={r.name} req={r} />
              ))}

              {/* 가중합 → 보정 → 최종. 계산 과정을 그대로 드러낸다. */}
              <dl className="mt-4 border-t-2 border-line pt-4 text-[13px]">
                <div className="flex justify-between py-1">
                  <dt className="text-muted">가중합</dt>
                  <dd className="text-strong">{position.fulfillmentSum.toFixed(2)} / 1.00</dd>
                </div>
                {penalty > 0 && (
                    <div className="flex justify-between py-1">
                      <dt className="text-muted">
                        보정
                        {unmetRequired.length > 0 && (
                            <span className="ml-2 text-xs">
                        필수 조건 {unmetRequired.length}개 미충족
                      </span>
                        )}
                      </dt>
                      <dd className="text-strong">−{penalty}p</dd>
                    </div>
                )}
                <div className="mt-1 flex justify-between border-t border-dashed border-line pt-2 font-bold text-strong">
                  <dt>최종 적합도</dt>
                  <dd>{position.fitScore}%</dd>
                </div>
              </dl>
            </Card>

            <Card>
              <h2 className="mb-1.5 text-lg font-semibold text-strong">내 이력으로 맞추는 방향</h2>
              <p className="mb-4 text-[13px] text-muted">
                지금 가진 이력만으로 이 공고에 어떻게 쓸지 정리했습니다.
              </p>
              <AdviceList items={position.advice} />
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="px-5 py-7 text-center">
              <span className="text-xs text-muted">적합도</span>
              <span
                  className="mt-1 block text-[40px] font-bold tracking-tight"
                  style={{ color: `var(--color-${tone})` }}
              >
              {position.fitScore}%
            </span>
              <Badge tone={tone}>{fitLabel(position.fitScore)}</Badge>
              <FitMeter score={position.fitScore} className="my-4" />
              <p className="text-xs text-muted">
                필수 {required.length}개 중 {met(required)}개 충족
              </p>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 font-semibold text-strong">공고 요약</h3>
              <dl className="text-[13px]">
                <Row label="직무" value={position.title} />
                <Row label="경력" value={position.experience} />
                <Row
                    label="필수 조건"
                    value={`${required.length}개 중 ${met(required)}개 충족`}
                />
                <Row
                    label="우대 조건"
                    value={`${preferred.length}개 중 ${met(preferred)}개 충족`}
                />
              </dl>
            </Card>

            <Link href={`/documents/${position.id}`}>
              <Button block>이 포지션에 맞춰 문서 만들기</Button>
            </Link>
            <Link href={`/apply?position=${position.id}`}>
              <Button variant="secondary" block>
                원본 공고 보기
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
      <div className="flex justify-between border-b border-dashed border-line py-2.5 last:border-0">
        <dt className="text-muted">{label}</dt>
        <dd className="text-right text-strong">{value}</dd>
      </div>
  );
}