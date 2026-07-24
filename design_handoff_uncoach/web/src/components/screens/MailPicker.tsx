"use client";
import { useApp } from "@/lib/client/store";
import { situationsForRole } from "@/lib/domain/situations";
import type { Situation } from "@/lib/domain/types";
import type { ScreenKey } from "@/components/AppShell";
import ProfileChip from "@/components/stitch/ProfileChip";

// pi_5 행 스타일 5종 — 실제 상황 목록에 순환 적용해 디자인을 유지한다.
const STYLES = [
  { iconWrap: "bg-primary-fixed text-primary", hoverText: "group-hover:text-primary", bar: "group-hover:bg-primary", badgeCls: "bg-primary-container text-on-primary-container", chevron: "group-hover:text-primary", tone: "격식있음" },
  { iconWrap: "bg-secondary-fixed text-on-secondary-fixed", hoverText: "group-hover:text-secondary", bar: "group-hover:bg-secondary", badgeCls: "bg-secondary-container text-on-secondary-container", chevron: "group-hover:text-secondary", tone: "캐주얼" },
  { iconWrap: "bg-slate-dark text-white", hoverText: "group-hover:text-slate-dark", bar: "group-hover:bg-slate-dark", badgeCls: "bg-inverse-surface text-inverse-on-surface", chevron: "group-hover:text-slate-dark", tone: "매우 격식있음" },
  { iconWrap: "bg-surface-variant text-on-surface-variant", hoverText: "group-hover:text-on-surface-variant", bar: "group-hover:bg-slate-muted", badgeCls: "bg-surface-container-highest text-on-surface-variant", chevron: "group-hover:text-slate-muted", tone: "실무" },
  { iconWrap: "bg-error-container text-on-error-container", hoverText: "group-hover:text-error", bar: "group-hover:bg-error", badgeCls: "bg-error-container/50 text-on-error-container", chevron: "group-hover:text-error", tone: "진중함" },
];

function iconFor(sit: Situation): string {
  const s = (sit.rel || "") + (sit.counterpart || "") + (sit.title || "");
  if (/사과|실수|지연|문제/.test(s)) return "report_problem";
  if (/제안|견적|수주|공식/.test(s)) return "description";
  if (/교수|지도|학회|추천/.test(s)) return "school";
  if (/휴가|부재|자동/.test(s)) return "flight_takeoff";
  if (/거래처|클라이언트|파트너|협력/.test(s)) return "handshake";
  if (/일정|미팅|회의|팔로업/.test(s)) return "event";
  return "mail";
}

export default function MailPicker({ nav, onPick, onCreate }: { nav: (k: ScreenKey) => void; onPick: (sit: Situation) => void; onCreate: () => void }) {
  const app = useApp();
  const role = app.profile?.role;
  // situationsForRole이 직업으로 이미 걸러준다 — 목록에 남은 건 전부 내 직업 상황이다.
  const list = situationsForRole(role, "email").slice(0, 6);
  const roleMatched = !!role && list.length > 0;

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border-light h-16 flex items-center px-4 md:px-8">
        <button onClick={() => nav("training")} className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h1 className="ml-4 font-headline-md text-headline-md text-primary">메일 상황 선택</h1>
        <div className="ml-auto flex items-center gap-2">
          <ProfileChip name={app.profile?.name || app.profile?.role} />
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">어떤 상황의 메일을 작성해볼까요?</h2>
          <p className="font-body-lg text-body-lg text-slate-muted">
            {roleMatched ? `${role}이(가) 실무에서 자주 쓰는 이메일 시나리오예요.` : "실제 업무에서 자주 발생하는 다양한 시나리오를 통해 이메일 작성 스킬을 훈련하세요."}
          </p>
        </section>

        <section className="flex flex-col gap-4">
          {list.length === 0 && (
            <div className="p-8 text-center border border-dashed border-border-light rounded-xl text-sm text-on-surface-variant">
              {role ? `${role}에 맞는 메일 상황을 준비 중이에요.` : "메일 상황을 불러오지 못했어요."}
            </div>
          )}
          {list.map((sit, idx) => {
            const st = STYLES[idx % STYLES.length];
            const fill = st.iconWrap.includes("slate-dark") || st.iconWrap.includes("error-container");
            return (
              <button
                key={sit.id}
                onClick={() => onPick(sit)}
                className="w-full text-left bg-surface-container-lowest border border-border-light rounded-xl p-5 shadow-card hover:shadow-card hover:bg-surface-container-low transition-all duration-200 group flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className={"absolute left-0 top-0 bottom-0 w-1 bg-transparent transition-colors " + st.bar} />
                <div className={"w-12 h-12 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform " + st.iconWrap}>
                  <span className="material-symbols-outlined" style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}>{iconFor(sit)}</span>
                </div>
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className={"font-headline-md text-headline-md text-on-surface transition-colors " + st.hoverText}>{sit.title}</h3>
                    <span className={"px-2.5 py-1 rounded-md font-label-sm text-label-sm whitespace-nowrap " + st.badgeCls}>{st.tone}</span>
                  </div>
                  <p className="font-body-md text-body-md text-slate-muted">{sit.goal}</p>
                  <p className="font-label-sm text-label-sm text-outline">상대: {sit.counterpart}</p>
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-light">
                  <span className={"material-symbols-outlined text-outline group-hover:translate-x-1 transition-all hidden sm:block " + st.chevron}>chevron_right</span>
                </div>
              </button>
            );
          })}

          {/* 목록에 내 상황이 없을 때의 출구. 직업별로 걸러 3~5개만 보이므로 여기서 막히는 일이 흔하다. */}
          <button
            onClick={onCreate}
            className="w-full text-left border border-dashed border-border-light rounded-xl p-5 hover:border-primary/40 hover:bg-surface-container-low transition-colors group flex items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="w-12 h-12 rounded-lg bg-surface-container-low text-slate-muted flex items-center justify-center shrink-0 group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined">edit_note</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">내 상황 직접 쓰기</h3>
              <p className="font-body-md text-slate-muted">지금 쓰기 어려운 메일이 있다면 한 문장으로 적어주세요.</p>
            </div>
            <span className="material-symbols-outlined text-outline ml-auto group-hover:translate-x-1 group-hover:text-primary transition-all hidden sm:block">chevron_right</span>
          </button>
        </section>
      </main>
    </div>
  );
}
