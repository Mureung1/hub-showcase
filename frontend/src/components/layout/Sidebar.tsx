"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";
import { ME } from "@/lib/mock";
import { FitMeter } from "@/components/ui/FitMeter";

const NAV = [
  { href: "/positions", label: "포지션", icon: "▦" },
  { href: "/credentials", label: "내 이력", icon: "▤" },
  { href: "/documents/toss-backend-platform", label: "생성 문서", icon: "✎" },
];

/** 디자인.md 5.1 — 전역 네비 + 하단 이력 완성도 패널 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface p-4 pt-6 lg:flex">
      <Link href="/positions" className="flex items-center gap-2.5 px-2 pb-6 text-base font-bold text-strong">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-primary text-[15px] text-white">◎</span>
        적합도
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href.split("/").slice(0, 2).join("/"));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "flex items-center gap-2.5 rounded-btn px-3 py-2.5 transition-colors",
                active
                  ? "bg-primary-soft font-semibold text-primary"
                  : "font-medium text-muted hover:bg-bg",
              )}
            >
              <span aria-hidden>{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-card bg-[linear-gradient(160deg,#4C6FFF,#6B8AFF)] p-[18px] text-white">
        <h4 className="mb-1.5 text-sm font-semibold">이력 완성도 {ME.completeness}%</h4>
        <p className="mb-3 text-xs opacity-85">
          포트폴리오를 추가하면 더 정확한 포지션을 찾습니다.
        </p>
        <FitMeter score={ME.completeness} onDark className="mb-3" label="이력 완성도" />
        <Link
          href="/credentials"
          className="block rounded-[9px] bg-white py-2 text-center text-[13px] font-semibold text-primary"
        >
          이력 완성하기
        </Link>
      </div>
    </aside>
  );
}
