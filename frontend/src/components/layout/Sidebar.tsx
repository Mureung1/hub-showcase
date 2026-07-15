"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutGrid,
  IconFileCv,
  IconSparkles,
  IconBookmark,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import { clsx } from "@/lib/clsx";
import { ME, SIDEBAR_STATS } from "@/lib/mock";
import { CompletenessRing } from "@/components/ui/CompletenessRing";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  /** 우측 카운트 배지 */
  count?: number;
}

const NAV: NavItem[] = [
  { href: "/positions", label: "포지션", icon: IconLayoutGrid, count: SIDEBAR_STATS.positionCount },
  { href: "/credentials", label: "내 이력", icon: IconFileCv },
  { href: "/documents/toss-backend-platform", label: "생성 문서", icon: IconSparkles, count: SIDEBAR_STATS.docCount },
  { href: "/saved", label: "저장한 공고", icon: IconBookmark },
];

/** 디자인.md 5.1 — 전역 네비. 완성도 링 + 아이콘 메뉴 + 현황 위젯 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-62 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface p-4 pt-5 lg:flex">
      {/* 로고 */}
      <Link href="/positions" className="flex items-center gap-2.5 px-1.5 pb-4 text-[15px] font-semibold text-strong">
        <span className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-primary text-white">◎</span>
        적합도
      </Link>

      {/* 완성도 링 */}
      <Link
        href="/credentials"
        className="mb-4 flex items-center gap-3.5 rounded-xl bg-[#F7F8FC] p-3.5 transition-colors hover:bg-[#F1F2F6]"
      >
        <CompletenessRing percentage={ME.completeness} />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-strong">이력 완성도</div>
          <div className="mt-0.5 text-xs text-muted">
            {ME.missing.length > 0 ? `${ME.missing[0]} 1개 남음` : "모두 채웠어요"}
          </div>
        </div>
      </Link>

      {/* 메뉴 */}
      <SectionLabel>메뉴</SectionLabel>
      <nav className="mb-4 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon, count }) => {
          const base = "/" + href.split("/")[1];
          const active = pathname.startsWith(base);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-[11px] rounded-btn px-3 py-2.5 text-sm transition-colors",
                active ? "bg-primary-soft font-semibold text-primary" : "text-muted hover:bg-bg",
              )}
            >
              <Icon size={18} stroke={1.75} />
              {label}
              {count != null && (
                <span
                  className={clsx(
                    "ml-auto rounded-badge px-[7px] py-px text-[11px] font-semibold",
                    active ? "bg-primary text-white" : "bg-[#F1F2F6] text-muted",
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 이번 주 현황 */}
      <SectionLabel>이번 주 현황</SectionLabel>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Stat value={`${SIDEBAR_STATS.topFitScore}%`} label="최고 적합도" />
        <Stat value={String(SIDEBAR_STATS.appliedCount)} label="지원 완료" />
      </div>

      {/* 하단 CTA — 새 포지션 알림 */}
      <div className="mt-auto rounded-card bg-primary p-3.5 text-white">
        <div className="mb-0.5 text-[13px] font-semibold">새 포지션 {SIDEBAR_STATS.newPositions}개</div>
        <p className="mb-2.5 text-xs opacity-85">어제 이후 올라온 공고를 확인하세요.</p>
        <Link
          href="/positions"
          className="block rounded-lg bg-white py-1.5 text-center text-xs font-semibold text-primary"
        >
          지금 보기
        </Link>
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-2 text-[11px] font-semibold tracking-wide text-muted">{children}</div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[10px] bg-[#F7F8FC] px-3 py-2.5">
      <div className="text-xl font-semibold text-strong">{value}</div>
      <div className="mt-px text-[11px] text-muted">{label}</div>
    </div>
  );
}
