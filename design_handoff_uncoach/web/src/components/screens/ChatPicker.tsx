"use client";
import { useApp } from "@/lib/client/store";
import { situationsForRole } from "@/lib/domain/situations";
import type { Situation } from "@/lib/domain/types";
import type { ScreenKey } from "@/components/AppShell";
import ProfileChip from "@/components/stitch/ProfileChip";

function iconFor(sit: Situation): string {
  const s = (sit.rel || "") + (sit.counterpart || "");
  if (/교수|지도|학회|조교|학생/.test(s)) return "school";
  if (/상사|팀장|대표|사장|점장|상급/.test(s)) return "work";
  if (/고객|불만|손님|구매|민원|주민/.test(s)) return "support_agent";
  if (/거래처|클라이언트|파트너|바이어|협력/.test(s)) return "handshake";
  if (/면접|채용|인사|담당자/.test(s)) return "badge";
  if (/의사|환자|보호자|간호/.test(s)) return "health_and_safety";
  if (/동료|후배|팀원|조원|또래/.test(s)) return "groups";
  return "forum";
}

function meta(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const diff = ["초급", "중급", "고급"][h % 3];
  const time = ["10분", "15분", "20분"][(h >> 2) % 3];
  const xp = diff === "초급" ? "+150 XP" : diff === "중급" ? "+250 XP" : "+400 XP";
  return { diff, time, xp };
}

export default function ChatPicker({ nav, onPick, onCreate }: { nav: (k: ScreenKey) => void; onPick: (sit: Situation) => void; onCreate: () => void }) {
  const app = useApp();
  const role = app.profile?.role;
  // situationsForRole이 직업으로 이미 걸러준다 — 목록에 남은 건 전부 내 직업 상황이다.
  const list = situationsForRole(role, "chat").slice(0, 6);
  const roleMatched = !!role && list.length > 0;
  const featured = list[0];
  const rest = list.slice(1);

  return (
    <div className="bg-background text-on-background min-h-screen antialiased flex flex-col">
      {/* TopAppBar */}
      <header className="fixed top-0 right-0 left-0 z-40 flex justify-between items-center px-8 h-16 bg-surface/80 backdrop-blur-md border-b border-border-light">
        <div className="flex items-center gap-4">
          <button onClick={() => nav("training")} className="p-2 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant flex items-center justify-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-primary">대화 상황 선택</h1>
        </div>
        <div className="flex items-center gap-2">
          <ProfileChip name={app.profile?.name || app.profile?.role} />
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow pt-24 px-4 md:px-margin-page pb-12 w-full max-w-7xl mx-auto">
        <div className="mb-stack-lg">
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-stack-sm tracking-tight">어떤 상황의 대화를 연습해볼까요?</h2>
          <p className="font-body-lg text-body-lg text-slate-muted">
            {roleMatched ? `${role}이(가) 자주 겪는 대화 시나리오예요.` : "훈련하고 싶은 대화 시나리오를 선택하세요."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter-grid">
          {list.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 p-8 text-center border border-dashed border-border-light rounded-xl text-sm text-on-surface-variant">
              {role ? `${role}에 맞는 대화 상황을 준비 중이에요.` : "대화 상황을 불러오지 못했어요."}
            </div>
          )}
          {/* Featured */}
          {featured && (() => {
            const m = meta(featured.id);
            return (
              <div className="bg-white rounded-xl overflow-hidden shadow-pop border-2 border-primary/20 relative group hover:shadow-pop transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full">
                <div className="p-padding-card flex-grow flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center shadow-card">
                      <span className="material-symbols-outlined text-primary">{iconFor(featured)}</span>
                    </div>
                    <span className="bg-primary text-white font-label-sm text-label-sm px-3 py-1 rounded-full shadow-card flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      추천
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-0.5 rounded">{m.diff}</span>
                    <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-0.5 rounded flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">timer</span> {m.time}</span>
                    <span className="bg-tertiary-container/20 text-tertiary font-label-sm text-label-sm px-2 py-0.5 rounded font-bold">{m.xp}</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-2 group-hover:text-primary transition-colors">{featured.title}</h3>
                  <p className="font-body-md text-body-md text-slate-muted mb-2">{featured.goal}</p>
                  <p className="font-label-sm text-label-sm text-outline mb-6 flex-grow">상대: {featured.counterpart}</p>
                  <button onClick={() => onPick(featured)} className="w-full bg-surface-container-high hover:bg-primary text-on-surface hover:text-white font-label-sm text-label-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-auto border border-border-light">
                    훈련 시작하기
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Rest */}
          {rest.map((sit) => {
            const m = meta(sit.id);
            return (
              <div key={sit.id} className="bg-white rounded-xl overflow-hidden shadow-card border border-border-light relative group hover:shadow-pop transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full">
                <div className="p-padding-card flex-grow flex flex-col">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-secondary">{iconFor(sit)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-0.5 rounded">{m.diff}</span>
                    <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-0.5 rounded flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">timer</span> {m.time}</span>
                    <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-0.5 rounded font-bold">{m.xp}</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-2 group-hover:text-primary transition-colors">{sit.title}</h3>
                  <p className="font-body-md text-body-md text-slate-muted mb-2">{sit.goal}</p>
                  <p className="font-label-sm text-label-sm text-outline mb-6 flex-grow">상대: {sit.counterpart}</p>
                  <button onClick={() => onPick(sit)} className="w-full bg-surface-container-high hover:bg-primary text-on-surface hover:text-white font-label-sm text-label-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-auto border border-border-light">
                    훈련 시작하기
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* 목록에 내 상황이 없을 때의 출구. 직업별로 걸러 3~5개만 보이므로 여기서 막히는 일이 흔하다. */}
          <button
            onClick={onCreate}
            className="text-left border border-dashed border-border-light rounded-xl p-padding-card hover:border-primary/40 hover:bg-surface-container-low transition-colors group flex flex-col justify-center items-start gap-3 min-h-[200px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="w-12 h-12 rounded-lg bg-surface-container-low text-slate-muted flex items-center justify-center group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined">edit_note</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">내 상황 직접 쓰기</h3>
            <p className="font-body-md text-body-md text-slate-muted">지금 말 꺼내기 어려운 일이 있다면 한 문장으로 적어주세요.</p>
          </button>
        </div>
      </main>
    </div>
  );
}
