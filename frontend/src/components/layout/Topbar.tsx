"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { getMe } from "@/lib/data";
import type { Me } from "@/lib/types";

/** 이름에서 아바타 이니셜을 만든다. 한글이면 앞 두 글자, 공백이 있으면 각 단어 첫 글자. */
function initialsOf(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
        return parts
            .slice(0, 2)
            .map((p) => p[0])
            .join("")
            .toUpperCase();
    }
    return name.trim().slice(0, 2);
}

export function Topbar({ back }: { back?: { href: string; label: string } }) {
    const [me, setMe] = useState<Me | null>(null);

    useEffect(() => {
        // 상단바는 보조 정보라, 실패해도 화면을 막지 않는다.
        void getMe()
            .then(setMe)
            .catch(() => setMe(null));
    }, []);

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-line bg-surface px-5 md:px-8">
            {back ? (
                <Link
                    href={back.href}
                    className="rounded-btn px-2 py-2 text-sm font-semibold text-primary hover:bg-primary-soft"
                >
                    ← {back.label}
                </Link>
            ) : (
                <div className="flex max-w-90 flex-1 items-center gap-2 rounded-btn border border-line bg-bg px-3 py-2 text-muted">
                    <span aria-hidden>🔍</span>
                    <input
                        aria-label="회사·직무 검색"
                        placeholder="회사·직무 검색"
                        className="flex-1 bg-transparent text-body outline-none"
                    />
                </div>
            )}
            {me && (
                <div className="ml-auto flex items-center gap-2 text-[13px] font-semibold text-strong">
                    <Avatar initials={initialsOf(me.name)} />
                    {me.name}
                </div>
            )}
        </header>
    );
}