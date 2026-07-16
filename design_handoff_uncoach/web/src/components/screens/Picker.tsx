"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/client/store";
import { SITUATIONS, REL_HINTS, personaOf } from "@/lib/domain/situations";
import type { Situation } from "@/lib/domain/types";

export default function Picker({ onPick, onNewSit }: { onPick: (s: Situation) => void; onNewSit: () => void }) {
  const app = useApp();
  const [mode, setMode] = useState<"scenario" | "context">("scenario");
  const [q, setQ] = useState("");
  const role = app.profile?.role;

  const query = q.trim().toLowerCase();
  const match = (s: Situation) =>
    !query || `${s.title} ${s.rel} ${s.tension} ${s.counterpart} ${s.goal}`.toLowerCase().includes(query);

  const all = useMemo(() => [...SITUATIONS, ...app.customSits], [app.customSits]);
  const customIds = useMemo(() => new Set(app.customSits.map((s) => s.id)), [app.customSits]);
  const scenarioSits = all.filter((s) => !s.ctx && (!role || !s.roles || s.roles.includes(role) || customIds.has(s.id)) && match(s));
  const contextSits = all.filter((s) => s.ctx && match(s));

  const relGroups = useMemo(() => {
    const order = [...new Set(scenarioSits.map((s) => s.rel))];
    return order.map((rel) => ({ rel, hint: REL_HINTS[rel] || "", items: scenarioSits.filter((s) => s.rel === rel) }));
  }, [scenarioSits]);

  const list = mode === "scenario" ? scenarioSits : contextSits;

  return (
    <div>
      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-extrabold">훈련 상황</h1>
        <button onClick={onNewSit} className="shrink-0 rounded-lg px-3 py-2 text-[12.5px] font-bold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          ＋ 내 상황
        </button>
      </div>
      <p className="mb-3.5 text-[13.5px]" style={{ color: "var(--sub)" }}>
        &apos;적절&apos;의 방향은 관계마다 달라집니다 — 교수에게는 완충이, 조원에게는 가벼움이 3점입니다.
      </p>

      {/* 2모드 탭 */}
      <div className="mb-3 flex gap-1.5 rounded-xl border p-1.5" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <Tab on={mode === "scenario"} onClick={() => setMode("scenario")}>시나리오 훈련 · {scenarioSits.length}</Tab>
        <Tab on={mode === "context"} onClick={() => setMode("context")}>실전 사례 · {contextSits.length}</Tab>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="상황 검색 — 제목·관계·긴장 포인트"
        className="mb-5 w-full rounded-xl border px-3.5 py-2.5 text-[14px] outline-none"
        style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--ink)" }}
      />

      {list.length === 0 && (
        <div className="rounded-2xl border border-dashed p-9 text-center text-[13.5px]" style={{ borderColor: "var(--line)", color: "var(--sub)" }}>
          {query ? `'${q}'에 맞는 상황이 없어요. 검색어를 지우거나 다른 탭을 확인해보세요.` : "표시할 상황이 없어요."}
        </div>
      )}

      {mode === "context" && contextSits.length > 0 && (
        <div className="rounded-2xl border p-5" style={{ background: "linear-gradient(135deg,var(--accent-soft),var(--surface))", borderColor: "var(--accent)" }}>
          <div className="mb-3.5 text-[12.5px]" style={{ color: "var(--sub)" }}>
            실제로 논란이 된 소통 실패(사과문·공지·갑질·해명·CS 등)를 익명·각색했습니다. 무엇이 문제인지 읽고 다시 써보세요.
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {contextSits.map((s) => (
              <SitCard key={s.id} s={s} chip={s.rel} onClick={() => onPick(s)} />
            ))}
          </div>
        </div>
      )}

      {mode === "scenario" &&
        relGroups.map((g) => (
          <div key={g.rel} className="mb-6">
            <div className="mb-2.5 flex items-baseline gap-2.5">
              <span className="rounded-full px-3 py-1 text-[12px] font-extrabold" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>{g.rel}</span>
              <span className="text-[12px]" style={{ color: "var(--sub)" }}>{g.hint}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {g.items.map((s) => (
                <SitCard
                  key={s.id}
                  s={s}
                  chip={customIds.has(s.id) ? "내 상황" : `핵심 ${s.axis}`}
                  onClick={() => onPick(s)}
                  onDelete={customIds.has(s.id) ? () => app.removeCustomSit(s.id) : undefined}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-lg py-2.5 text-center text-[13.5px] font-bold transition"
      style={{ background: on ? "var(--accent)" : "transparent", color: on ? "var(--accent-ink)" : "var(--sub)" }}
    >
      {children}
    </button>
  );
}

function SitCard({ s, chip, onClick, onDelete }: { s: Situation; chip: string; onClick: () => void; onDelete?: () => void }) {
  const p = personaOf(s);
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="flex w-full flex-col gap-1.5 rounded-xl border p-4 text-left transition"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        <span className="flex flex-wrap items-center justify-between gap-2 pr-6">
          <span className="flex items-center gap-1.5 text-[14.5px] font-bold" style={{ minWidth: 0 }}>
            <span>{p.emoji}</span>
            {s.title}
          </span>
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>{chip}</span>
        </span>
        <span className="text-[12.5px]" style={{ color: "var(--sub)", lineHeight: 1.55 }}>{s.tension}</span>
      </button>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("이 상황을 삭제할까요?")) onDelete();
          }}
          aria-label="삭제"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-[14px] transition"
          style={{ color: "var(--sub)" }}
        >
          ×
        </button>
      )}
    </div>
  );
}
