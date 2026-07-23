"use client";
import type { ScreenKey } from "@/components/AppShell";
import SideNav from "./SideNav";

export default function DashboardLayout({
  active,
  name = "Profile",
  nav,
  children,
}: {
  active: ScreenKey;
  name?: string;
  nav: (k: ScreenKey) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SideNav active={active} onNav={nav} />
      <main className="flex-1 md:ml-64 w-full min-h-screen flex flex-col relative">
        <header className="fixed top-0 right-0 left-0 md:left-64 z-40 flex justify-between items-center px-4 md:px-8 h-16 bg-surface/80 backdrop-blur-md border-b border-border-light">
          <div className="flex items-center gap-2 md:hidden">
            <span className="material-symbols-outlined text-primary text-2xl">psychology</span>
            <span className="font-headline-md text-headline-md font-bold text-primary">uncoach-pi</span>
          </div>
          <div className="hidden md:flex flex-1 max-w-md relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              type="text"
              placeholder="검색..."
              className="w-full bg-surface-container-lowest border border-border-light rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <button className="p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full relative" aria-label="알림">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
            </button>
            <button className="hidden md:flex p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full" aria-label="앱">
              <span className="material-symbols-outlined">apps</span>
            </button>
            <button className="flex items-center gap-2 pl-2 md:pl-4 border-l border-border-light ml-2">
              <span className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">{(name || "U")[0]}</span>
              <span className="hidden md:block font-label-sm text-label-sm font-medium">{name}</span>
            </button>
          </div>
        </header>
        <div className="flex-1 pt-20 px-4 md:px-8 pb-8 max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
