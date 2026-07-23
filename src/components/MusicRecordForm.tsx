import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { MusicRecordDraft, SpotifyTrack } from "../types/music";
import { validateMusicRecordInput } from "../validation/musicRecordValidation";

interface MusicRecordFormProps {
  onSave: (draft: MusicRecordDraft) => Promise<void>;
  onSearchTracks: (keyword: string, signal: AbortSignal) => Promise<SpotifyTrack[]>;
  getToday?: () => Date;
}

export function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MusicRecordForm({
  onSave,
  onSearchTracks,
  getToday = () => new Date(),
}: MusicRecordFormProps) {
  const [today] = useState(getToday);
  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [emotion, setEmotion] = useState("");
  const [errors, setErrors] = useState<ReturnType<typeof validateMusicRecordInput>>({});
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const dateKey = toLocalDateKey(today);
  const displayDate = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(today);

  useEffect(() => {
    const query = keyword.trim();

    if (selectedTrack || query.length === 0) {
      setSearchResults([]);
      setSearchError("");
      setIsLoading(false);
      setIsDropdownOpen(false);
      return;
    }

    if (query.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setIsLoading(false);
      setIsDropdownOpen(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setSearchError("");
      setIsDropdownOpen(true);

      try {
        const results = await onSearchTracks(query, controller.signal);
        setSearchResults(results);
        setActiveIndex(0);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSearchResults([]);
        setSearchError(error instanceof Error ? error.message : "음악을 불러오지 못했어요");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [keyword, onSearchTracks, selectedTrack]);

  const selectTrack = (track: SpotifyTrack) => {
    setSelectedTrack(track);
    setKeyword(track.title);
    setSearchResults([]);
    setSearchError("");
    setIsDropdownOpen(false);
    setErrors((current) => ({ ...current, track: undefined }));
    setStatus("");
  };

  const clearSelectedTrack = () => {
    setSelectedTrack(null);
    setKeyword("");
    setSearchResults([]);
    setIsDropdownOpen(false);
    setStatus("");
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || searchResults.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, searchResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectTrack(searchResults[activeIndex]);
    } else if (event.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateMusicRecordInput(selectedTrack, emotion);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !selectedTrack) return;

    setIsSaving(true);
    try {
      await onSave({
        ...selectedTrack,
        emotion: emotion.trim(),
      });
      setStatus("오늘의 음악 기록을 남겼어요.");
      setSelectedTrack(null);
      setKeyword("");
      setEmotion("");
      setSearchResults([]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "음악 기록을 저장하지 못했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="record-form" onSubmit={handleSubmit} noValidate>
      <header className="today-header">
        <span>Today</span>
        <time dateTime={dateKey}>{displayDate}</time>
      </header>

      <section className="journal-prompt" aria-labelledby="music-prompt">
        <p id="music-prompt">오늘의 음악</p>

        {selectedTrack ? (
          <div className="selected-track-card">
            {selectedTrack.albumImageUrl ? (
              <img src={selectedTrack.albumImageUrl} alt="" />
            ) : (
              <div className="track-cover-fallback" aria-hidden="true">SWIM</div>
            )}
            <div>
              <strong>{selectedTrack.title}</strong>
              <span>{selectedTrack.artistName}</span>
              <small>{selectedTrack.albumName}</small>
            </div>
            <button type="button" onClick={clearSelectedTrack}>변경</button>
          </div>
        ) : (
          <div className="track-search">
            <label className="field-label" htmlFor="trackKeyword">노래 검색</label>
            <input
              ref={searchInputRef}
              id="trackKeyword"
              type="search"
              value={keyword}
              placeholder="노래 제목이나 가수를 검색해보세요"
              aria-invalid={Boolean(errors.track)}
              aria-describedby={errors.track ? "track-error" : undefined}
              aria-expanded={isDropdownOpen}
              autoComplete="off"
              onChange={(event) => {
                setKeyword(event.target.value);
                setErrors((current) => ({ ...current, track: undefined }));
                setStatus("");
              }}
              onFocus={() => {
                if (searchResults.length > 0 || isLoading || searchError) {
                  setIsDropdownOpen(true);
                }
              }}
              onKeyDown={handleSearchKeyDown}
            />
            {errors.track && <span id="track-error" className="field-error">{errors.track}</span>}

            {isDropdownOpen && (
              <div className="track-dropdown" role="listbox" aria-label="Spotify search results">
                {isLoading ? (
                  <p className="dropdown-state">음악을 찾고 있어요...</p>
                ) : searchError ? (
                  <div className="dropdown-state" role="status">
                    <strong>음악을 불러오지 못했어요</strong>
                    <span>잠시 후 다시 시도해주세요.</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="dropdown-state">검색 결과가 없어요. 다른 노래 제목이나 가수 이름으로 검색해보세요.</p>
                ) : (
                  searchResults.map((track, index) => (
                    <button
                      key={track.spotifyTrackId}
                      className={index === activeIndex ? "active" : ""}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectTrack(track)}
                    >
                      {track.albumImageUrl ? (
                        <img src={track.albumImageUrl} alt="" />
                      ) : (
                        <span className="track-cover-fallback" aria-hidden="true">SWIM</span>
                      )}
                      <span>
                        <strong>{track.title}</strong>
                        <small>{track.artistName}</small>
                        <em>{track.albumName}</em>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="journal-prompt" aria-labelledby="emotion-prompt">
        <p id="emotion-prompt">오늘의 감정</p>
        <label className="field-label" htmlFor="emotion">한 줄로 남기기</label>
        <textarea
          id="emotion"
          rows={4}
          value={emotion}
          maxLength={161}
          aria-invalid={Boolean(errors.emotion)}
          aria-describedby={errors.emotion ? "emotion-error" : "emotion-hint"}
          placeholder="오늘의 마음은 어떤 온도였나요?"
          onChange={(event) => {
            setEmotion(event.target.value);
            setErrors((current) => ({ ...current, emotion: undefined }));
            setStatus("");
          }}
        />
        <div className="field-meta">
          {errors.emotion ? (
            <span id="emotion-error" className="field-error">{errors.emotion}</span>
          ) : (
            <span id="emotion-hint">최대 160자</span>
          )}
          <span>{emotion.length}/160</span>
        </div>
      </section>

      <button className="save-button" type="submit" disabled={isSaving || !selectedTrack || !emotion.trim()}>
        {isSaving ? "기록하는 중..." : "기록하기"}
      </button>
      <p className="form-status" role="status" aria-live="polite">{status}</p>
    </form>
  );
}
