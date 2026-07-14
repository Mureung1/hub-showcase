import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/** 사이드바 + 탑바 + 콘텐츠. 모든 로그인 후 화면이 이 셸을 쓴다. */
export function AppShell({
  children,
  back,
}: {
  children: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar back={back} />
        <main className="w-full max-w-[1200px] p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHead({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-strong">{title}</h1>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
