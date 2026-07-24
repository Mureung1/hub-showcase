"use client";
import type { ScreenKey } from "@/components/AppShell";
import SideNav, { NAV_ITEMS } from "./SideNav";
import ProfileChip from "./ProfileChip";

export default function DashboardLayout({
  active,
  name,
  nav,
  children,
}: {
  active: ScreenKey;
  name?: string;
  nav: (k: ScreenKey) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-on-background overflow-x-hidden">
      <SideNav active={active} onNav={nav} />
      {/* w-full + md:ml-64 를 같이 주면 폭이 100%+256px 이 돼서 우측이 잘린다. 마진만 준다. */}
      <main className="md:ml-64 min-h-screen flex flex-col relative">
        <header className="fixed top-0 right-0 left-0 md:left-64 z-40 flex justify-between items-center px-4 md:px-8 h-16 bg-surface/80 backdrop-blur-md border-b border-border-light">
          <div className="flex items-center gap-2 md:hidden">
            <span className="material-symbols-outlined text-primary text-[24px]">psychology</span>
            <span className="font-headline-md text-headline-md text-primary">언코</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <ProfileChip name={name} />
          </div>
        </header>
        <div className="flex-1 pt-20 px-4 md:px-8 pb-24 md:pb-8 max-w-6xl mx-auto w-full">{children}</div>
        {/* 모바일은 사이드바가 숨겨져 이동할 방법이 없어서 하단 탭을 둔다. */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex bg-surface-container-lowest border-t border-border-light pb-[env(safe-area-inset-bottom)]">
          {NAV_ITEMS.map((it) => {
            const on = active === it.key;
            return (
              <button
                key={it.key}
                onClick={() => nav(it.key)}
                className={"flex-1 flex flex-col items-center gap-0.5 py-2 " + (on ? "text-primary" : "text-slate-muted")}
              >
                <span className="material-symbols-outlined text-[22px]" style={on ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {it.icon}
                </span>
                <span className="font-label-sm">{it.label}</span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
