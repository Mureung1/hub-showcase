"use client";
import { useApp } from "@/lib/client/store";
import { useTheme } from "@/lib/client/theme";
import AccountSection from "../AccountSection";

export default function Settings({ onReprofile }: { onReprofile: () => void }) {
  const app = useApp();
  const p = app.profile;
  const [theme, toggleTheme] = useTheme();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">설정</h1>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--sub)" }}>계정·프로필·데이터를 관리합니다.</p>

      <AccountSection />

      <div className="mb-4 flex items-center justify-between rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <div>
          <div className="text-[13.5px] font-bold">화면 테마</div>
          <div className="text-[12px]" style={{ color: "var(--sub)" }}>{theme === "dark" ? "다크 모드" : "라이트 모드"}</div>
        </div>
        <button
          onClick={toggleTheme}
          aria-label="테마 전환"
          className="relative h-7 w-12 rounded-full transition"
          style={{ background: theme === "dark" ? "var(--accent)" : "var(--line)" }}
        >
          <span
            className="absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[12px] transition-all"
            style={{ left: theme === "dark" ? "22px" : "2px", background: "var(--surface)" }}
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </span>
        </button>
      </div>

      <div className="mb-4 rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <div className="mb-3 text-[12px] font-extrabold" style={{ color: "var(--sub)" }}>내 프로필</div>
        <Row label="직업·상황">{p?.role || "-"}</Row>
        <Row label="나이대">{p?.age || "-"}</Row>
        <Row label="성별">{p?.gender || "-"}</Row>
        <button onClick={onReprofile} className="mt-3 w-full rounded-xl border py-2.5 text-[13.5px] font-semibold" style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--accent)" }}>
          프로필 다시 설정
        </button>
      </div>

      <div className="mb-4 rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <div className="mb-1 text-[12px] font-extrabold" style={{ color: "var(--sub)" }}>데이터</div>
        <div className="mb-3 text-[12.5px]" style={{ color: "var(--sub)", lineHeight: 1.6 }}>
          세션 {app.history.length}개 · 잘 쓴 표현 {app.assets.length}개 · 내 상황 {app.customSits.length}개
        </div>
        <button
          onClick={() => {
            if (confirm("프로필·훈련 기록·자산·내 상황이 모두 지워집니다. 계속할까요?")) app.reset();
          }}
          className="w-full rounded-xl border py-2.5 text-[13.5px] font-semibold transition"
          style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--bad)" }}
        >
          모든 기록 지우기
        </button>
      </div>

      <div className="rounded-2xl border p-4 text-[12px]" style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--sub)", lineHeight: 1.7 }}>
        언코 — 화용 능력 코칭. 대신 써주지 않고, 상황·관계·전략 3축으로 채점해 스스로 다시 쓰게 훈련합니다.
        기록은 이 기기에 저장되며, 서버(DB)가 연결돼 있으면 계정처럼 이어집니다.
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-0.5 text-[13px]">
      <span className="shrink-0 font-semibold" style={{ color: "var(--sub)", minWidth: 72 }}>{label}</span>
      <span style={{ color: "var(--ink)" }}>{children}</span>
    </div>
  );
}
