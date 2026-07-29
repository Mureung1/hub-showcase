import { useCallback, useEffect, useState } from "react";
import {
  disconnectSpotify,
  getSpotifyConnection,
  startSpotifyConnection,
  type SpotifyConnection as SpotifyConnectionState,
} from "../services/spotifyConnectionService";

interface SpotifyConnectionProps {
  apiBaseUrl: string;
  accessToken: string;
  onNavigate?: (url: string) => void;
}

type SpotifyCallbackResult = "connected" | "cancelled" | "error" | null;

function readCallbackResult(): SpotifyCallbackResult {
  const search = new URLSearchParams(window.location.search);
  const status = search.get("spotify");
  if (status === "connected") return "connected";
  if (status === "error") {
    return search.get("reason") === "cancelled"
      ? "cancelled"
      : "error";
  }
  return null;
}

function removeCallbackParameters() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("spotify") && !url.searchParams.has("reason")) return;
  url.searchParams.delete("spotify");
  url.searchParams.delete("reason");
  window.history.replaceState({}, "", url);
}

export function SpotifyConnection({
  apiBaseUrl,
  accessToken,
  onNavigate = (url) => window.location.assign(url),
}: SpotifyConnectionProps) {
  const [connection, setConnection] = useState<SpotifyConnectionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [callbackResult] = useState(readCallbackResult);
  const [retryKey, setRetryKey] = useState(0);

  const loadConnection = useCallback((signal?: AbortSignal) => (
    getSpotifyConnection(apiBaseUrl, accessToken, signal).then(setConnection)
  ), [accessToken, apiBaseUrl]);

  useEffect(() => {
    removeCallbackParameters();
    const controller = new AbortController();
    setIsLoading(true);
    setError("");
    loadConnection(controller.signal)
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Spotify 연결 상태를 확인하지 못했어요.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [loadConnection, retryKey]);

  const handleConnect = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setError("");
    try {
      onNavigate(await startSpotifyConnection(apiBaseUrl, accessToken));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Spotify 연결을 시작하지 못했어요.");
      setIsUpdating(false);
    }
  };

  const handleDisconnect = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setError("");
    try {
      await disconnectSpotify(apiBaseUrl, accessToken);
      setConnection({ connected: false, displayName: null, scope: null, tokenExpiresAt: null });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Spotify 연결을 해제하지 못했어요.");
    } finally {
      setIsUpdating(false);
    }
  };

  const notice = callbackResult === "connected"
    ? connection?.connected
      ? "Spotify 계정이 연결됐어요."
      : ""
    : callbackResult === "cancelled"
      ? "Spotify 연결을 취소했어요."
      : callbackResult === "error"
        ? "Spotify 계정을 연결하지 못했어요. 다시 시도해 주세요."
        : "";

  return (
    <aside className="spotify-connection" aria-labelledby="spotify-connection-title">
      <div>
        <p className="recap-label">Spotify Connection</p>
        <h3 id="spotify-connection-title">내 음악 일기를 Spotify와 이어보세요</h3>
        <p>다음 단계에서 이달의 음악을 비공개 플레이리스트로 담기 위해 계정을 연결해요.</p>
      </div>

      {isLoading ? (
        <p className="spotify-connection-status" role="status">연결 상태를 확인하는 중...</p>
      ) : error && !connection ? (
        <div className="spotify-connection-action">
          <p role="alert">{error}</p>
          <button type="button" className="retry-button" onClick={() => setRetryKey((key) => key + 1)}>다시 시도</button>
        </div>
      ) : connection?.connected ? (
        <div className="spotify-connection-action">
          <p className="spotify-connected-name"><span aria-hidden="true" />{connection.displayName || "Spotify 계정"} 연결됨</p>
          <button type="button" className="spotify-secondary-button" disabled={isUpdating} onClick={handleDisconnect}>
            {isUpdating ? "연결 해제 중..." : "연결 해제"}
          </button>
        </div>
      ) : (
        <div className="spotify-connection-action">
          <button type="button" className="spotify-connect-button" disabled={isUpdating} onClick={handleConnect}>
            {isUpdating ? "Spotify로 이동 중..." : "Spotify 계정 연결"}
          </button>
        </div>
      )}

      {notice && <p className="spotify-connection-notice" role="status">{notice}</p>}
      {error && connection && <p className="spotify-connection-error" role="alert">{error}</p>}
    </aside>
  );
}
