import { useCallback, useEffect, useState } from "react";
import { MusicCard } from "./components/MusicCard";
import { MusicRecordForm } from "./components/MusicRecordForm";
import { AuthScreen } from "./components/AuthScreen";
import { UserList } from "./components/UserList";
import { FollowingFeed } from "./components/FollowingFeed";
import { PublicProfile } from "./components/PublicProfile";
import { MonthlyRecap } from "./components/MonthlyRecap";
import { ThemeControl } from "./components/ThemeControl";
import type { Session } from "@supabase/supabase-js";
import { getCurrentSession, getProfile, signOut, subscribeToAuthChanges } from "./services/authService";
import type { AuthProfile } from "./services/authService";
import type { MusicRecord, MusicRecordDraft, SpotifyTrack } from "./types/music";
import { updateMusicRecordLike } from "./services/likesService";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

interface ApiMusicRecord {
  id: string | number;
  userId: string;
  spotifyTrackId: string | null;
  songTitle: string;
  artistName: string;
  albumName: string | null;
  albumImageUrl: string | null;
  externalUrl: string | null;
  emotionText: string;
  recordDate: string;
  createdAt: string;
  liked: boolean;
  likeCount: number;
  author: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  } | null;
}

interface AppProps {
  initialRecords?: MusicRecord[];
  initialView?: "auth" | "diary";
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
    liked: record.liked,
    likeCount: record.likeCount,
    author: record.author ?? null,
  };
}

function getProfileFromUrl() {
  const nickname = new URLSearchParams(window.location.search).get("profile")?.trim();
  return nickname && nickname.length >= 2 && nickname.length <= 20 ? nickname : null;
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return body.error?.message || body.message || fallback;
  } catch {
    return fallback;
  }
}

export function App({ initialRecords, initialView = "auth" }: AppProps) {
  const [records, setRecords] = useState<MusicRecord[]>(initialRecords ?? []);
  const [isLoading, setIsLoading] = useState(initialRecords === undefined);
  const [loadError, setLoadError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(initialView === "auth");
  const [authError, setAuthError] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [pendingLikeId, setPendingLikeId] = useState<string | null>(null);
  const [likeErrors, setLikeErrors] = useState<Record<string, string>>({});
  const [selectedProfile, setSelectedProfile] = useState<string | null>(getProfileFromUrl);
  const [peopleSearch, setPeopleSearch] = useState("");

  const applySession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setAuthError("");

    if (!nextSession) {
      setProfile(null);
      setIsAuthLoading(false);
      return;
    }

    try {
      setProfile(await getProfile(nextSession.user.id));
    } catch (error) {
      setProfile(null);
      setAuthError(error instanceof Error ? error.message : "프로필을 불러오지 못했어요.");
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialView !== "auth") return;

    const unsubscribe = subscribeToAuthChanges((nextSession) => {
      applySession(nextSession).catch(() => undefined);
    });

    getCurrentSession()
      .then(applySession)
      .catch((error) => {
        setAuthError(error instanceof Error ? error.message : "로그인 상태를 확인하지 못했어요.");
        setIsAuthLoading(false);
      });

    return unsubscribe;
  }, [applySession, initialView]);

  useEffect(() => {
    const handlePopState = () => setSelectedProfile(getProfileFromUrl());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const openProfile = useCallback((nickname: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("profile", nickname);
    window.history.pushState({}, "", url);
    setSelectedProfile(nickname);
  }, []);

  const closeProfile = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("profile");
    window.history.replaceState({}, "", url);
    setSelectedProfile(null);
  }, []);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = session?.access_token
        ? await fetch(`${apiBaseUrl}/api/music-records`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
        : await fetch(`${apiBaseUrl}/api/music-records`);
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
  }, [session?.access_token]);

  useEffect(() => {
    const canLoadRecords = initialView === "diary" || Boolean(session);
    if (initialRecords === undefined && canLoadRecords) {
      loadRecords().catch(() => undefined);
    }
  }, [initialRecords, initialView, loadRecords, session]);

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
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
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

  const toggleLike = async (id: string | number, nextLiked: boolean) => {
    if (!session?.access_token || pendingLikeId !== null) return;

    const recordKey = String(id);
    setPendingLikeId(recordKey);
    setLikeErrors((current) => ({ ...current, [recordKey]: "" }));

    try {
      const nextState = await updateMusicRecordLike(
        apiBaseUrl,
        session.access_token,
        id,
        nextLiked,
      );
      setRecords((current) => current.map((record) => (
        String(record.id) === nextState.recordId
          ? {
              ...record,
              liked: nextState.liked,
              likeCount: nextState.likeCount,
            }
          : record
      )));
    } catch (error) {
      setLikeErrors((current) => ({
        ...current,
        [recordKey]: error instanceof Error ? error.message : "좋아요 상태를 바꾸지 못했어요.",
      }));
    } finally {
      setPendingLikeId(null);
    }
  };

  const updateLikeCount = (id: string | number, likeCount: number) => {
    setRecords((current) => current.map((record) => (
      String(record.id) === String(id) ? { ...record, likeCount } : record
    )));
  };

  const syncPublicProfileLike = (
    id: string | number,
    liked: boolean,
    likeCount: number,
  ) => {
    setRecords((current) => current.map((record) => (
      String(record.id) === String(id) ? { ...record, liked, likeCount } : record
    )));
    setFeedRefreshKey((current) => current + 1);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setAuthError("");

    try {
      await signOut();
      await applySession(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "로그아웃하지 못했어요.");
    } finally {
      setIsSigningOut(false);
    }
  };

  if (initialView === "auth" && isAuthLoading) {
    return (
      <div className="auth-page">
        <header className="auth-utility"><ThemeControl /></header>
        <main className="auth-loading" role="status"><p className="eyebrow">SWIM</p><strong>당신의 음악 일기를 여는 중...</strong></main>
      </div>
    );
  }

  if (initialView === "auth" && !session) {
    return (
      <div className="auth-page">
        <header className="auth-utility"><ThemeControl /></header>
        <AuthScreen initialNotice={authError} onAuthenticated={(nextSession) => applySession(nextSession).catch(() => undefined)} />
      </div>
    );
  }

  if (session?.access_token && selectedProfile) {
    return (
      <main className="app-shell">
        <div className="profile-utility"><ThemeControl /></div>
        <PublicProfile
          nickname={selectedProfile}
          accessToken={session.access_token}
          apiBaseUrl={apiBaseUrl}
          onBack={closeProfile}
          onFollowChange={() => setFeedRefreshKey((current) => current + 1)}
          onLikeChange={syncPublicProfileLike}
          onOpenProfile={openProfile}
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">SWIM</p>
          <strong>One Day. One Song. One Memory.</strong>
        </div>
        <div className="header-actions">
          <ThemeControl />
          <div className="header-account">
            <span>{profile?.nickname ?? session?.user.email ?? "Music Diary"}</span>
            <button type="button" onClick={() => handleSignOut().catch(() => undefined)} disabled={isSigningOut}>{isSigningOut ? "나가는 중..." : "로그아웃"}</button>
          </div>
        </div>
      </header>

      {authError && <p className="app-auth-error" role="alert">{authError}</p>}

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
                <MusicCard
                  key={record.id}
                  record={record}
                  showLikeState
                  isLikePending={pendingLikeId !== null}
                  likeError={likeErrors[String(record.id)]}
                  onToggleLike={session?.access_token ? toggleLike : undefined}
                  apiBaseUrl={session?.access_token ? apiBaseUrl : undefined}
                  accessToken={session?.access_token}
                  onLikeCountChange={updateLikeCount}
                  onOpenAuthor={openProfile}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {session?.access_token && (
        <>
          <MonthlyRecap
            accessToken={session.access_token}
            apiBaseUrl={apiBaseUrl}
          />
          <FollowingFeed
            accessToken={session.access_token}
            apiBaseUrl={apiBaseUrl}
            refreshKey={feedRefreshKey}
            onOpenProfile={openProfile}
          />
          <UserList
            accessToken={session.access_token}
            apiBaseUrl={apiBaseUrl}
            onFollowChange={() => setFeedRefreshKey((current) => current + 1)}
            onOpenProfile={openProfile}
            searchValue={peopleSearch}
            onSearchValueChange={setPeopleSearch}
          />
        </>
      )}
    </main>
  );
}
