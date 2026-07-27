"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell, PageHead } from "@/components/layout/AppShell";
import { DocEditor } from "@/components/documents/DocEditor";
import { ApiError, getPosition } from "@/lib/data";
import type { PositionDetail } from "@/lib/types";

/** F6 — AI 문서 생성 (디자인.md 6.5) */
export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [position, setPosition] = useState<PositionDetail | null>(null);

    useEffect(() => {
        getPosition(id)
            .then((p) => {
                if (!p) router.replace("/positions");
                else setPosition(p);
            })
            .catch((err) => {
                if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                    router.replace("/login");
                }
            });
    }, [id, router]);

    return (
        <AppShell back={{ href: `/positions/${id}`, label: "포지션 상세" }}>
            <PageHead
                title="AI 문서"
                description={
                    position
                        ? `${position.company} · ${position.title}에 맞춰 생성합니다. 그대로 고쳐 쓸 수 있습니다.`
                        : "포지션 정보를 불러오는 중입니다…"
                }
            />
            <DocEditor positionId={id} />
        </AppShell>
    );
}