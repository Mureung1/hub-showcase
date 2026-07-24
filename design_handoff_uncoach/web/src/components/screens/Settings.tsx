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
    <DashboardLayout active="settings" name={app.profile?.name || app.profile?.role} nav={nav}>
      <div className="max-w-2xl">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">설정</h2>
        <p className="text-on-surface-variant mb-8">계정·프로필·데이터를 관리합니다.</p>

        <div className="bg-white rounded-xl p-padding-card border border-border-light shadow-card flex items-center justify-between mb-4">
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

        <div className="bg-white rounded-xl p-padding-card border border-border-light shadow-card mb-4">
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

        {/* 직접 만든 상황은 여기서만 지울 수 있다. 픽커에 계속 쌓이면 목록이 흐려진다. */}
        <div className="bg-white rounded-xl p-padding-card border border-border-light shadow-card mb-4">
          <div className="font-medium text-on-surface mb-1">내가 만든 상황</div>
          {app.customSits.length === 0 ? (
            <p className="text-sm text-on-surface-variant">아직 없어요. 상황 목록 맨 아래 &lsquo;내 상황 직접 쓰기&rsquo;에서 만들 수 있습니다.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border-light">
              {app.customSits.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0">
                  <span className="material-symbols-outlined text-slate-muted text-[20px] shrink-0">{s.medium === "email" ? "mail" : "forum"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-on-surface truncate">{s.title}</div>
                    <div className="font-label-sm text-outline truncate">{s.medium === "email" ? "메일 훈련" : "대화 훈련"} · 상대: {s.rel}</div>
                  </div>
                  <button
                    onClick={() => { if (confirm(`'${s.title}' 상황을 지울까요? 훈련 기록은 남습니다.`)) app.removeCustomSit(s.id); }}
                    aria-label={`${s.title} 지우기`}
                    className="w-9 h-9 shrink-0 rounded-lg text-slate-muted hover:text-error hover:bg-error-container/40 transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl p-padding-card border border-border-light shadow-card">
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
