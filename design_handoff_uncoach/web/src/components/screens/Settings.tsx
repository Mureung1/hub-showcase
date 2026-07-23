"use client";
import { useApp } from "@/lib/client/store";
import { useTheme } from "@/lib/client/theme";
import { logout } from "@/lib/client/api";
import DashboardLayout from "@/components/stitch/DashboardLayout";
import type { ScreenKey } from "@/components/AppShell";

export default function Settings({ nav }: { nav: (k: ScreenKey) => void }) {
  const app = useApp();
  const [theme, toggleTheme] = useTheme();

  return (
    <DashboardLayout active="settings" name={app.profile?.role || "Profile"} nav={nav}>
      <div className="max-w-2xl">
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-1">설정</h2>
        <p className="text-on-surface-variant mb-8">계정·프로필·데이터를 관리합니다.</p>

        <div className="bg-white rounded-2xl p-padding-card border border-border-light shadow-[0_4px_20px_rgba(15,23,42,0.05)] flex items-center justify-between mb-4">
          <div>
            <div className="font-medium text-on-surface">화면 테마</div>
            <div className="text-sm text-on-surface-variant">{theme === "dark" ? "다크 모드" : "라이트 모드"}</div>
          </div>
          <button onClick={toggleTheme} className="relative h-7 w-12 rounded-full transition" style={{ background: theme === "dark" ? "var(--color-primary)" : "var(--color-surface-container-high)" }}>
            <span className="absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs transition-all" style={{ left: theme === "dark" ? "22px" : "2px" }}>
              {theme === "dark" ? "🌙" : "☀️"}
            </span>
          </button>
        </div>

        <div className="bg-white rounded-2xl p-padding-card border border-border-light shadow-[0_4px_20px_rgba(15,23,42,0.05)] mb-4">
          <div className="font-medium text-on-surface mb-3">내 정보</div>
          <div className="text-sm text-on-surface-variant space-y-1">
            <div>목표: {app.profile?.goal || "-"}</div>
            <div>세션 {app.history.length}개 · 잘 쓴 표현 {app.assets.length}개</div>
          </div>
          <button
            onClick={async () => {
              try {
                await logout();
              } catch {}
              window.location.reload();
            }}
            className="mt-4 w-full py-2.5 rounded-lg border border-border-light text-on-surface-variant text-sm font-semibold hover:bg-surface-container-low"
          >
            로그아웃
          </button>
        </div>

        <div className="bg-white rounded-2xl p-padding-card border border-border-light shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <div className="font-medium text-on-surface mb-1">데이터</div>
          <p className="text-sm text-on-surface-variant mb-3">프로필·훈련 기록·자산이 모두 지워지고 처음부터 다시 시작합니다.</p>
          <button
            onClick={() => {
              if (confirm("모든 기록이 지워집니다. 계속할까요?")) {
                app.reset();
                nav("home");
              }
            }}
            className="w-full py-2.5 rounded-lg border border-border-light text-error text-sm font-semibold hover:bg-error-container/40"
          >
            모든 기록 지우기 (프로필 재설정)
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
