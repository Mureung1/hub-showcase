import { useEffect, useMemo, useState } from "react";
import {
  getMonthlyRecap,
  type MonthlyRecap as MonthlyRecapData,
  type RecapTrack,
} from "../services/recapsService";
import { SpotifyConnection } from "./SpotifyConnection";
import { SpotifyPlaylistExport } from "./SpotifyPlaylistExport";

interface MonthlyRecapProps {
  apiBaseUrl: string;
  accessToken: string;
  initialMonth?: string;
}

function getCurrentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function formatMonth(value: string) {
  const { year, month } = parseMonth(value);
  return `${year}년 ${month}월`;
}

function formatDate(value: string) {
  const [, month, day] = value.split("-").map(Number);
  return `${month}월 ${day}일`;
}

function TrackCover({ track, className }: { track: RecapTrack; className: string }) {
  return track.albumImageUrl ? (
    <img className={className} src={track.albumImageUrl} alt={`${track.albumName ?? track.songTitle} 앨범 커버`} />
  ) : (
    <div className={`${className} recap-cover-fallback`} aria-hidden="true">SWIM</div>
  );
}

function BookendTrack({ label, track }: { label: string; track: RecapTrack }) {
  return (
    <article className="recap-bookend">
      <TrackCover track={track} className="recap-bookend-cover" />
      <div>
        <span>{label}</span>
        <strong>{track.songTitle}</strong>
        <p>{track.artistName}</p>
        <small>{formatDate(track.recordDate)}</small>
      </div>
    </article>
  );
}

export function MonthlyRecap({
  apiBaseUrl,
  accessToken,
  initialMonth = getCurrentMonth(),
}: MonthlyRecapProps) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [recap, setRecap] = useState<MonthlyRecapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { year, month } = parseMonth(selectedMonth);
    setIsLoading(true);
    setError("");

    getMonthlyRecap(apiBaseUrl, accessToken, year, month, controller.signal)
      .then((nextRecap) => {
        if (!controller.signal.aborted) setRecap(nextRecap);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setRecap(null);
          setError(
            reason instanceof Error ? reason.message : "월간 기록을 불러오지 못했어요.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [accessToken, apiBaseUrl, retryKey, selectedMonth]);

  const representativeTrack = useMemo(
    () => [...(recap?.tracks ?? [])].reverse().find((track) => track.albumImageUrl)
      ?? recap?.lastRecord
      ?? null,
    [recap],
  );

  return (
    <section className="recap-section" aria-labelledby="monthly-recap-title">
      <div className="recap-heading">
        <div className="section-heading">
          <span>Monthly Recap</span>
          <h2 id="monthly-recap-title">한 달의 음악 일기</h2>
          <p>노래와 함께 지나온 마음을 천천히 다시 펼쳐보세요.</p>
        </div>
        <label className="recap-month-picker">
          <span>돌아볼 달</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => {
              if (event.target.value) setSelectedMonth(event.target.value);
            }}
          />
        </label>
      </div>

      <SpotifyConnection
        apiBaseUrl={apiBaseUrl}
        accessToken={accessToken}
        onConnectionChange={setIsSpotifyConnected}
      />

      {isLoading ? (
        <div className="recap-state" role="status">한 달의 음악을 모으는 중...</div>
      ) : error ? (
        <div className="recap-state" role="alert">
          <strong>월간 기록을 열지 못했어요.</strong>
          <p>{error}</p>
          <button className="retry-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
            다시 시도
          </button>
        </div>
      ) : !recap || recap.recordCount === 0 ? (
        <div className="recap-state recap-empty">
          <span aria-hidden="true">SWIM</span>
          <strong>{formatMonth(selectedMonth)}에는 아직 음악 기록이 없어요.</strong>
          <p>한 곡을 남기면 이곳에 한 달의 음악 이야기가 차곡차곡 모여요.</p>
        </div>
      ) : (
        <div className="recap-content">
          {isSpotifyConnected && (
            <SpotifyPlaylistExport
              apiBaseUrl={apiBaseUrl}
              accessToken={accessToken}
              year={recap.year}
              month={recap.month}
            />
          )}
          <div className="recap-hero">
            {representativeTrack && (
              <TrackCover track={representativeTrack} className="recap-hero-cover" />
            )}
            <div className="recap-hero-copy">
              <p>{formatMonth(selectedMonth)}</p>
              <strong>{recap.recordDays}일의 기억</strong>
              <span>{recap.recordCount}곡이 이번 달의 마음을 함께했어요.</span>
            </div>
          </div>

          <section className="recap-artists" aria-labelledby="recap-artists-title">
            <p className="recap-label" id="recap-artists-title">자주 함께한 아티스트</p>
            <ol>
              {recap.topArtists.map((artist) => (
                <li key={artist.artistName}>
                  <strong>{artist.artistName}</strong>
                  <span>{artist.recordCount}곡</span>
                </li>
              ))}
            </ol>
          </section>

          {recap.firstRecord && recap.lastRecord && (
            <div className="recap-bookends">
              <BookendTrack label="이달의 첫 음악" track={recap.firstRecord} />
              <BookendTrack label="이달의 마지막 음악" track={recap.lastRecord} />
            </div>
          )}

          <section className="recap-timeline" aria-labelledby="recap-timeline-title">
            <div>
              <p className="recap-label">Monthly Timeline</p>
              <h3 id="recap-timeline-title">이달의 음악 타임라인</h3>
            </div>
            <ol>
              {recap.tracks.map((track) => (
                <li key={track.id}>
                  <time dateTime={track.recordDate}>{formatDate(track.recordDate)}</time>
                  <TrackCover track={track} className="recap-timeline-cover" />
                  <div>
                    <strong>{track.songTitle}</strong>
                    <span>{track.artistName}</span>
                    <p>{track.emotionText}</p>
                  </div>
                  {track.externalUrl && (
                    <a href={track.externalUrl} target="_blank" rel="noreferrer">
                      Spotify
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </section>
  );
}
