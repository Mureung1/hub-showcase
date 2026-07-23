"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell, PageHead } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { PositionCard } from "@/components/positions/PositionCard";
import { PositionFilters } from "@/components/positions/PositionFilters";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiError, listPositions, recalculate } from "@/lib/data";
import type { Position } from "@/lib/types";

type View =
    | { phase: "loading" }
    | { phase: "failed"; message: string }
    | { phase: "ready"; positions: Position[] };

/** F4 — 포지션 목록 (적합도순 정렬). 토큰이 localStorage 에 있어 클라이언트 컴포넌트. */
export default function PositionsPage() {
    const router = useRouter();
    const [view, setView] = useState<View>({ phase: "loading" });
    const [calculating, setCalculating] = useState(false);

    const load = useCallback(async () => {
        setView({ phase: "loading" });
        try {
            const positions = await listPositions();
            // 백엔드가 정렬해 내려주지만, 순서는 이 화면의 계약이므로 한 번 더 보장한다.
            setView({
                phase: "ready",
                positions: [...positions].sort((a, b) => b.fitScore - a.fitScore),
            });
        } catch (err) {
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                router.replace("/login");
                return;
            }
            setView({ phase: "failed", message: toMessage(err) });
        }
    }, [router]);

    useEffect(() => {
        void load();
    }, [load]);

    async function handleRecalculate() {
        setCalculating(true);
        try {
            await recalculate();
            await load();
        } catch (err) {
            setView({ phase: "failed", message: toMessage(err) });
        } finally {
            setCalculating(false);
        }
    }

    const positions = view.phase === "ready" ? view.positions : [];
    // 포지션은 있는데 점수가 전부 0 — 아직 매칭을 돌리지 않은 상태.
    const uncalculated =
        view.phase === "ready" &&
        positions.length > 0 &&
        positions.every((p) => !p.fitScore);

    return (
        <AppShell>
            <PageHead
                title="내 이력에 맞는 포지션"
                description={describe(view, uncalculated)}
                action={
                    <Button
                        variant="secondary"
                        onClick={handleRecalculate}
                        disabled={calculating || view.phase === "loading"}
                    >
                        {calculating ? "계산 중…" : "적합도 다시 계산"}
                    </Button>
                }
            />

            <PositionFilters />

            {view.phase === "loading" && <PositionSkeleton />}

            {view.phase === "failed" && (
                <div className="flex flex-col items-start gap-3 rounded-lg border border-current/10 p-6">
                    <p className="text-sm">{view.message}</p>
                    <Button variant="secondary" onClick={() => void load()}>
                        다시 불러오기
                    </Button>
                </div>
            )}

            {view.phase === "ready" && positions.length === 0 && (
                <EmptyState
                    title="아직 추천할 포지션이 없습니다"
                    description="이력을 먼저 입력하면 적합도를 계산해 드립니다."
                    actionLabel="이력 입력하기"
                />
            )}

            {view.phase === "ready" && uncalculated && (
                <div className="flex flex-col items-start gap-3 rounded-lg border border-current/10 p-6">
                    <p className="text-sm">
                        포지션 {positions.length}개를 가져왔지만 적합도가 아직 계산되지 않았습니다.
                    </p>
                    <Button onClick={handleRecalculate} disabled={calculating}>
                        {calculating ? "계산 중…" : "적합도 계산"}
                    </Button>
                </div>
            )}

            {view.phase === "ready" && positions.length > 0 && !uncalculated && (
                <div className="flex flex-col gap-3">
                    {positions.map((p, i) => (
                        <PositionCard key={p.id} position={p} rank={i + 1} />
                    ))}
                </div>
            )}
        </AppShell>
    );
}

function describe(view: View, uncalculated: boolean): string {
    if (view.phase === "loading") return "적합도를 계산해 정렬하는 중입니다";
    if (view.phase === "failed") return "포지션을 불러오지 못했습니다";
    if (uncalculated) return "적합도 계산이 필요합니다";
    return `이력 기준으로 적합도를 계산해 높은 순으로 정렬했습니다 · ${view.positions.length}개`;
}

function toMessage(err: unknown): string {
    if (err instanceof ApiError) return err.message;
    // fetch 자체가 실패하면 TypeError 만 남아 원인을 알 수 없다 — 가장 흔한 원인을 안내한다.
    return "백엔드에 연결하지 못했습니다. 서버가 8080 포트에서 실행 중인지 확인해 주세요.";
}

function PositionSkeleton() {
    return (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="포지션 불러오는 중">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="h-28 animate-pulse rounded-lg border border-current/10 bg-current/[0.03]"
                />
            ))}
        </div>
    );
}