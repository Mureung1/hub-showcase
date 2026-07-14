import { useState } from "react";
import { MusicCard } from "./components/MusicCard";
import { MusicRecordForm } from "./components/MusicRecordForm";
import type { MusicRecord, MusicRecordDraft } from "./types/music";

export const mockRecords: MusicRecord[] = [
  {
    id: "mock-night-changes",
    songTitle: "Night Changes",
    artistName: "One Direction",
    emotion: "천천히 흘러가도 괜찮았던 조용한 하루.",
    recordDate: "2026-07-08",
    liked: false,
  },
  {
    id: "mock-sweet-disposition",
    songTitle: "Sweet Disposition",
    artistName: "The Temper Trap",
    emotion: "늦은 버스를 타고 집으로 돌아가던 순간.",
    recordDate: "2026-07-07",
    liked: true,
  },
];

interface AppProps {
  initialRecords?: MusicRecord[];
}

export function App({ initialRecords = mockRecords }: AppProps) {
  const [records, setRecords] = useState<MusicRecord[]>(initialRecords);

  const saveRecord = (draft: MusicRecordDraft): "added" | "replaced" => {
    const existing = records.find((record) => record.recordDate === draft.recordDate);
    const nextRecord: MusicRecord = {
      ...draft,
      id: existing?.id ?? `record-${draft.recordDate}-${Date.now()}`,
      liked: existing?.liked ?? false,
    };

    setRecords((current) =>
      [...current.filter((record) => record.recordDate !== draft.recordDate), nextRecord].sort(
        (a, b) => b.recordDate.localeCompare(a.recordDate),
      ),
    );
    return existing ? "replaced" : "added";
  };

  const toggleLike = (id: string) => {
    setRecords((current) =>
      current.map((record) =>
        record.id === id ? { ...record, liked: !record.liked } : record,
      ),
    );
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">SWIM</p>
          <strong>One Day. One Song. One Memory.</strong>
        </div>
        <span className="header-note">Music Diary</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="page-kicker">Record your day with music.</p>
        <h1 id="page-title">Create Record</h1>
        <p>오늘을 기억하게 하는 한 곡과 한 줄의 감정을 남겨보세요.</p>
      </section>

      <div className="workspace-layout">
        <section aria-labelledby="form-title">
          <div className="section-heading">
            <span>Today&apos;s Song</span>
            <h2 id="form-title">음악 기록 입력</h2>
          </div>
          <MusicRecordForm onSave={saveRecord} />
        </section>

        <section aria-labelledby="records-title">
          <div className="section-heading records-heading">
            <div>
              <span>Music Diary</span>
              <h2 id="records-title">나의 음악 카드</h2>
            </div>
            <strong>{records.length}</strong>
          </div>

          {records.length === 0 ? (
            <div className="empty-state">
              <span aria-hidden="true">♪</span>
              <h3>아직 기록된 음악이 없어요.</h3>
              <p>왼쪽 입력 화면에서 오늘의 첫 곡을 남겨보세요.</p>
            </div>
          ) : (
            <div className="record-list">
              {records.map((record) => (
                <MusicCard key={record.id} record={record} onToggleLike={toggleLike} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
