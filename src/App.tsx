import { useCallback, useEffect, useState } from "react";
import { MusicCard } from "./components/MusicCard";
import { MusicRecordForm } from "./components/MusicRecordForm";
import type { MusicRecord, MusicRecordDraft, SpotifyTrack } from "./types/music";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

interface ApiMusicRecord {
  id: string | number;
  spotifyTrackId: string | null;
  songTitle: string;
  artistName: string;
  albumName: string | null;
  albumImageUrl: string | null;
  externalUrl: string | null;
  emotionText: string;
  recordDate: string;
  createdAt: string;
}

interface AppProps {
  initialRecords?: MusicRecord[];
}

function toMusicRecord(record: ApiMusicRecord): MusicRecord {
  return {
    id: record.id,
    spotifyTrackId: record.spotifyTrackId ?? null,
    songTitle: record.songTitle,
    artistName: record.artistName,
    albumName: record.albumName ?? null,
    albumImageUrl: record.albumImageUrl ?? null,
    externalUrl: record.externalUrl ?? null,
    emotion: record.emotionText,
    recordDate: record.recordDate,
    liked: false,
  };
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return body.error?.message || body.message || fallback;
  } catch {
    return fallback;
  }
}

export function App({ initialRecords }: AppProps) {
  const [records, setRecords] = useState<MusicRecord[]>(initialRecords ?? []);
  const [isLoading, setIsLoading] = useState(initialRecords === undefined);
  const [loadError, setLoadError] = useState("");

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/music-records`);
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "음악 기록을 불러오지 못했어요."));
      }
      const body: { data: ApiMusicRecord[] } = await response.json();
      setRecords(body.data.map(toMusicRecord));
    } catch (error) {
      const message = error instanceof Error ? error.message : "음악 기록을 불러오지 못했어요.";
      setLoadError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialRecords === undefined) {
      loadRecords().catch(() => undefined);
    }
  }, [initialRecords, loadRecords]);

  const searchTracks = useCallback(async (keyword: string, signal: AbortSignal): Promise<SpotifyTrack[]> => {
    const response = await fetch(
      `${apiBaseUrl}/api/spotify/search?q=${encodeURIComponent(keyword)}`,
      { signal },
    );

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, "음악을 불러오지 못했어요"));
    }

    return response.json();
  }, []);

  const saveRecord = async (draft: MusicRecordDraft) => {
    const response = await fetch(`${apiBaseUrl}/api/music-records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spotifyTrackId: draft.spotifyTrackId,
        songTitle: draft.title,
        artistName: draft.artistName,
        albumName: draft.albumName,
        albumImageUrl: draft.albumImageUrl,
        externalUrl: draft.externalUrl,
        emotionText: draft.emotion,
      }),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, "음악 기록을 저장하지 못했어요."));
    }

    await loadRecords();
  };

  const toggleLike = (id: string | number) => {
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
        <p>오늘을 기억하게 해주는 한 곡과 한 줄의 감정을 남겨보세요.</p>
      </section>

      <div className="workspace-layout">
        <section aria-labelledby="form-title">
          <div className="section-heading">
            <span>Today&apos;s Song</span>
            <h2 id="form-title">음악 기록 입력</h2>
          </div>
          <MusicRecordForm onSave={saveRecord} onSearchTracks={searchTracks} />
        </section>

        <section aria-labelledby="records-title">
          <div className="section-heading records-heading">
            <div>
              <span>Music Diary</span>
              <h2 id="records-title">나의 음악 카드</h2>
            </div>
            <strong>{records.length}</strong>
          </div>

          {isLoading ? (
            <div className="empty-state"><p>음악 기록을 불러오는 중...</p></div>
          ) : loadError ? (
            <div className="empty-state" role="status">
              <h3>기록을 불러오지 못했어요.</h3>
              <p>{loadError}</p>
              <button className="retry-button" type="button" onClick={() => loadRecords().catch(() => undefined)}>다시 시도</button>
            </div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              <span aria-hidden="true">SWIM</span>
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
