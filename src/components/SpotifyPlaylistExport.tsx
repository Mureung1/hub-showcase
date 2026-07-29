import { useEffect, useState } from "react";
import {
  exportSpotifyPlaylist,
  type SpotifyPlaylistExport as SpotifyPlaylistExportResult,
} from "../services/spotifyPlaylistService";

interface SpotifyPlaylistExportProps {
  apiBaseUrl: string;
  accessToken: string;
  year: number;
  month: number;
}

export function SpotifyPlaylistExport({
  apiBaseUrl,
  accessToken,
  year,
  month,
}: SpotifyPlaylistExportProps) {
  const [result, setResult] = useState<SpotifyPlaylistExportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setResult(null);
    setError("");
  }, [month, year]);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setError("");
    try {
      setResult(await exportSpotifyPlaylist(apiBaseUrl, accessToken, year, month));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Spotify 플레이리스트를 만들지 못했어요.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="spotify-playlist-export">
      <div>
        <p className="recap-label">Keep this month</p>
        <strong>이달의 음악을 Spotify에 간직하세요</strong>
      </div>
      {result ? (
        <a href={result.playlistUrl} target="_blank" rel="noreferrer">
          Spotify에서 {result.trackCount}곡 열기
        </a>
      ) : (
        <button type="button" disabled={isExporting} onClick={handleExport}>
          {isExporting ? "플레이리스트 만드는 중..." : "비공개 플레이리스트 만들기"}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
