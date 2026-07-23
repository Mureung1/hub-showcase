import { supabase } from "./lib/supabase";
import React, { useState, useEffect } from "react";
import { ClothingItem, SavedOutfit, CalendarEvent, UserProfile, StickerDiaryPage } from "./types";
import { DEFAULT_CLOSET } from "./data/presets";
import HomeTab from "./components/HomeTab";
import ClosetTab from "./components/ClosetTab";
import OutfitsTab from "./components/OutfitsTab";
import CalendarTab from "./components/CalendarTab";
import StickersTab from "./components/StickersTab";
import SystemTab from "./components/SystemTab";
import LoginPanel from "./components/LoginPanel";
import AvatarRenderer from "./components/AvatarRenderer";
import { Shirt, Sparkles, Calendar, Heart, Settings, Star, Layers, Home } from "lucide-react";







const vibeAlbumCover = "/src/assets/images/vibe_album_cover_1783930828089.jpg";

export default function App() {
  // Navigation / Active Screen state
  const [activeTab, setActiveTab] = useState<"home" | "closet" | "outfits" | "calendar" | "stickers" | "system" | "login">("home");

  // Database states with LocalStorage persistence
  const [closet, setCloset] = useState<ClothingItem[]>([]);
  const [savedStyles, setSavedStyles] = useState<SavedOutfit[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [stickerDiaries, setStickerDiaries] = useState<StickerDiaryPage[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    username: "Cyber Stylist",
    avatarUrl: "cute-bunny",
    vaporMode: true,
    scanlineIntensity: 0.15,
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Aesthetic Modulator states
  const [vaporMode, setVaporMode] = useState<boolean>(true);
  const [scanlineOpacity, setScanlineOpacity] = useState<number>(0.15);

  // Helper to check if a Supabase user is logged in
  const isUserLoggedIn = () => currentUserId !== null;
  const scopedLocalKey = (key: string) => currentUserId
    ? `pmc_user_${currentUserId}_${key}`
    : `pmc_guest_${key}`;
  const safeSetLocalStorage = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`[Storage] Failed to save ${key}; continuing with database sync.`, error);
      return false;
    }
  };

  const loadGuestData = () => {
    const storedCloset = localStorage.getItem("pmc_guest_closet");
    setCloset(storedCloset ? JSON.parse(storedCloset) : DEFAULT_CLOSET);

    const storedStyles = localStorage.getItem("pmc_guest_saved_styles");
    setSavedStyles(storedStyles ? JSON.parse(storedStyles) : []);

    const storedEvents = localStorage.getItem("pmc_guest_calendar_events");
    setCalendarEvents(storedEvents ? JSON.parse(storedEvents) : []);

    const storedStickerDiaries = localStorage.getItem("pmc_guest_sticker_diaries");
    setStickerDiaries(storedStickerDiaries ? JSON.parse(storedStickerDiaries) : []);

    const storedProfile = localStorage.getItem("pmc_profile");
    setProfile(
      storedProfile
        ? JSON.parse(storedProfile)
        : {
          username: "Cyber Stylist",
          avatarUrl: "cute-bunny",
          vaporMode: true,
          scanlineIntensity: 0.15,
        }
    );
  };

  const loadUserDataFromSupabase = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_data")
      .select("closet, saved_styles, calendar_events, profile, sticker_diary")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[Supabase] Failed to load user data:", error.message);
      return;
    }

    if (!data) {
      const localBackupRaw = localStorage.getItem(`pmc_user_${userId}_closet`);
      const initialCloset: ClothingItem[] = localBackupRaw ? JSON.parse(localBackupRaw) : DEFAULT_CLOSET;
      const initialProfile = {
        username: localStorage.getItem("pmc_username") || "Cyber Stylist",
        avatarUrl: localStorage.getItem("pmc_avatar") || "cute-bunny",
        vaporMode: true,
        scanlineIntensity: 0.15,
      };

      const { error: insertError } = await supabase.from("user_data").insert({
        user_id: userId,
        closet: initialCloset,
        saved_styles: [],
        calendar_events: [],
        sticker_diary: [],
        profile: initialProfile,
      });

      if (insertError) {
        console.error("[Supabase] Failed to seed user data:", insertError.message);
        return;
      }

      setCloset(initialCloset);
      setSavedStyles([]);
      setCalendarEvents([]);
      setStickerDiaries([]);
      setProfile(initialProfile);
      return;
    }

    const remoteCloset: ClothingItem[] = Array.isArray(data.closet) ? data.closet : DEFAULT_CLOSET;
    const localBackupRaw = localStorage.getItem(`pmc_user_${userId}_closet`);
    const localBackup: ClothingItem[] = localBackupRaw ? JSON.parse(localBackupRaw) : [];
    const mergedCloset = [...localBackup, ...remoteCloset].filter((item, index, items) =>
      index === items.findIndex((candidate) =>
        candidate.id === item.id ||
        (candidate.name === item.name && candidate.imageUrl === item.imageUrl)
      )
    );

    setCloset(mergedCloset);
    safeSetLocalStorage(`pmc_user_${userId}_closet`, JSON.stringify(mergedCloset));
    if (mergedCloset.length !== remoteCloset.length) {
      const { error: recoveryError } = await supabase
        .from("user_data")
        .update({ closet: mergedCloset, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (recoveryError) console.error("[Supabase] Failed to recover local closet backup:", recoveryError.message);
    }
    setSavedStyles(Array.isArray(data.saved_styles) ? data.saved_styles : []);
    setCalendarEvents(Array.isArray(data.calendar_events) ? data.calendar_events : []);
    setStickerDiaries(Array.isArray(data.sticker_diary) ? data.sticker_diary : []);

    const loadedProfile = data.profile as UserProfile | null;
    if (loadedProfile) {
      setProfile({
        username: loadedProfile.username || "Cyber Stylist",
        avatarUrl: loadedProfile.avatarUrl || "cute-bunny",
        vaporMode: loadedProfile.vaporMode ?? true,
        scanlineIntensity: loadedProfile.scanlineIntensity ?? 0.15,
      });
    }
  };

  const syncUserDataToSupabase = async (
    updates: Partial<{
      closet: ClothingItem[];
      saved_styles: SavedOutfit[];
      calendar_events: CalendarEvent[];
      sticker_diary: StickerDiaryPage[];
      profile: UserProfile;
    }>
  ) => {
    let userId = currentUserId;
    if (!userId) {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("[Supabase] Failed to resolve session before sync:", sessionError.message);
        return;
      }
      userId = data.session?.user.id ?? null;
    }
    if (!userId) return;

    if (updates.closet) {
      safeSetLocalStorage(`pmc_user_${userId}_closet`, JSON.stringify(updates.closet));
    }
    if (updates.saved_styles) {
      safeSetLocalStorage(`pmc_user_${userId}_saved_styles`, JSON.stringify(updates.saved_styles));
    }

    const { error: updateError } = await supabase
      .from("user_data")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updateError) {
      console.error("[Supabase] Failed to update user data:", updateError.message);
      return false;
    }

    return true;
  };

  // Restore Supabase session and load the matching user data.
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("[Supabase] Session restore failed:", error.message);
        loadGuestData();
        return;
      }

      const user = data.session?.user;

      if (!mounted) return;

      if (user) {
        setCurrentUserId(user.id);
        await loadUserDataFromSupabase(user.id);
      } else {
        setCurrentUserId(null);
        loadGuestData();
      }

      const storedVapor = localStorage.getItem("pmc_vapor_mode");
      if (storedVapor !== null) {
        setVaporMode(storedVapor === "true");
      }

      const storedScanlines = localStorage.getItem("pmc_scanline_opacity");
      if (storedScanlines !== null) {
        setScanlineOpacity(parseFloat(storedScanlines));
      }
    };

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setCurrentUserId(session.user.id);
        await loadUserDataFromSupabase(session.user.id);
      } else {
        setCurrentUserId(null);
        loadGuestData();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sync state functions with auto-save to storage & Firestore proxy
  const handleAddItem = (item: ClothingItem) => {
    const updated = [item, ...closet];
    setCloset(updated);
    const storageKey = currentUserId ? `pmc_user_${currentUserId}_closet` : "pmc_guest_closet";
    void syncUserDataToSupabase({ closet: updated });
    safeSetLocalStorage(storageKey, JSON.stringify(updated));
  };

  const handleDeleteItem = (id: string) => {
    const updated = closet.filter(item => item.id !== id);
    setCloset(updated);
    const storageKey = currentUserId ? `pmc_user_${currentUserId}_closet` : "pmc_guest_closet";
    safeSetLocalStorage(storageKey, JSON.stringify(updated));
    void syncUserDataToSupabase({ closet: updated });
  };

  const handleSaveOutfit = (outfit: SavedOutfit) => {
    if (!isUserLoggedIn()) {
      return;
    }

    const updated = [outfit, ...savedStyles];
    setSavedStyles(updated);
    const storageKey = `pmc_user_${currentUserId}_saved_styles`;
    localStorage.setItem(storageKey, JSON.stringify(updated));
    syncUserDataToSupabase({ saved_styles: updated });
  };

  const handleDeleteOutfit = (id: string) => {
    const updated = savedStyles.filter(o => o.id !== id);
    setSavedStyles(updated);
    localStorage.setItem(scopedLocalKey("saved_styles"), JSON.stringify(updated));

    // Also cascade delete related calendar schedules on that outfit
    const updatedEvents = calendarEvents.filter(e => e.outfitId !== id);
    setCalendarEvents(updatedEvents);
    localStorage.setItem(scopedLocalKey("calendar_events"), JSON.stringify(updatedEvents));

    if (isUserLoggedIn()) {
      syncUserDataToSupabase({
        saved_styles: updated,
        calendar_events: updatedEvents,
      });
    }
  };

  const handleAddCalendarEvent = (date: string, outfitId: string) => {
    // Overwrite if date already has schedule
    const base = calendarEvents.filter(e => e.date !== date);
    const updated = [...base, { date, outfitId }];
    setCalendarEvents(updated);
    localStorage.setItem(scopedLocalKey("calendar_events"), JSON.stringify(updated));
    if (isUserLoggedIn()) {
      syncUserDataToSupabase({ calendar_events: updated });
    }
  };

  const handleRemoveCalendarEvent = (date: string) => {
    const updated = calendarEvents.filter(e => e.date !== date);
    setCalendarEvents(updated);
    localStorage.setItem(scopedLocalKey("calendar_events"), JSON.stringify(updated));
    if (isUserLoggedIn()) {
      syncUserDataToSupabase({ calendar_events: updated });
    }
  };

  const handleSaveStickerDiary = async (page: StickerDiaryPage): Promise<boolean> => {
    const existingIndex = stickerDiaries.findIndex(item => item.id === page.id);
    const updated =
      existingIndex >= 0
        ? stickerDiaries.map(item => (item.id === page.id ? page : item))
        : [page, ...stickerDiaries];

    setStickerDiaries(updated);
    localStorage.setItem(scopedLocalKey("sticker_diaries"), JSON.stringify(updated));

    if (isUserLoggedIn()) {
      const { error } = await supabase
        .from("user_data")
        .upsert(
          {
            user_id: currentUserId,
            sticker_diary: updated,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("[Supabase] Failed to save sticker diary:", error.message);
        return false;
      }
    }

    return true;
  };

  const handleDeleteStickerDiary = async (id: string): Promise<boolean> => {
    const updated = stickerDiaries.filter(page => page.id !== id);

    setStickerDiaries(updated);
    localStorage.setItem(scopedLocalKey("sticker_diaries"), JSON.stringify(updated));

    if (isUserLoggedIn()) {
      const { error } = await supabase
        .from("user_data")
        .upsert(
          {
            user_id: currentUserId,
            sticker_diary: updated,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("[Supabase] Failed to delete sticker diary:", error.message);
        return false;
      }
    }

    return true;
  };

  const handleProfileChange = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem("pmc_profile", JSON.stringify(updatedProfile));
    if (isUserLoggedIn()) {
      syncUserDataToSupabase({ profile: updatedProfile });
    }
  };

  const handleToggleVaporMode = () => {
    const nextVal = !vaporMode;
    setVaporMode(nextVal);
    localStorage.setItem("pmc_vapor_mode", String(nextVal));
  };

  const handleScanlineChange = (opacity: number) => {
    setScanlineOpacity(opacity);
    localStorage.setItem("pmc_scanline_opacity", String(opacity));
  };

  const handleResetApp = () => {
    localStorage.clear();
    setCloset(DEFAULT_CLOSET);
    setSavedStyles([]);
    setCalendarEvents([]);
    setStickerDiaries([]);
    setProfile({
      username: "Cyber Stylist",
      avatarUrl: "cute-bunny",
      vaporMode: true,
      scanlineIntensity: 0.15,
    });
    setVaporMode(true);
    setScanlineOpacity(0.15);

    if (isUserLoggedIn()) {
      syncUserDataToSupabase({
        closet: DEFAULT_CLOSET,
        saved_styles: [],
        calendar_events: [],
        sticker_diary: [],
        profile: {
          username: "Cyber Stylist",
          avatarUrl: "cute-bunny",
          vaporMode: true,
          scanlineIntensity: 0.15,
        },
      });
    }

    alert("시스템 레지스트리 및 데이터베이스가 완전히 초기화되었습니다! ⚙️");
    setActiveTab("outfits");
  };

  return (
    <div className={`min-h-screen text-on-surface bg-background flex flex-col font-body-md selection:bg-primary selection:text-on-primary transition-all relative overflow-x-hidden ${vaporMode ? "shadow-[inset_0_0_80px_rgba(153,0,207,0.15)]" : ""
      }`}>
      {/* 1. Retro Scanline Overlay */}
      <div className="scanlines" style={{ opacity: scanlineOpacity }}></div>

      {/* Background Floating Cute Pixel Arts */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none opacity-45">
        {/* Top Left */}
        <div className="absolute left-[3%] top-[12%] text-6xl animate-float-slow select-none filter drop-shadow-[0_0_15px_rgba(236,178,255,0.4)]" title="👾">👾</div>
        <div className="absolute left-[14%] top-[20%] text-3xl animate-float-medium opacity-60 select-none" title="✨">✨</div>

        {/* Top Right */}
        <div className="absolute right-[4%] top-[14%] text-7xl animate-float-medium select-none filter drop-shadow-[0_0_20px_rgba(0,238,252,0.5)]" title="🪐">🪐</div>
        <div className="absolute right-[15%] top-[8%] text-4xl animate-float-slow opacity-75 select-none" title="🚀">🚀</div>

        {/* Center Left */}
        <div className="absolute left-[2%] top-[45%] text-5xl animate-float-fast select-none filter drop-shadow-[0_0_10px_rgba(0,238,252,0.4)]" title="🛸">🛸</div>
        <div className="absolute left-[13%] top-[55%] text-4xl animate-float-slow select-none opacity-65" title="👽">👽</div>

        {/* Center Right */}
        <div className="absolute right-[3%] top-[50%] text-6xl animate-float-slow select-none filter drop-shadow-[0_0_15px_rgba(236,178,255,0.3)]" title="☄️">☄️</div>
        <div className="absolute right-[14%] top-[38%] text-4xl animate-float-fast select-none opacity-70" title="🛰️">🛰️</div>

        {/* Bottom Left */}
        <div className="absolute left-[4%] bottom-[12%] text-6xl animate-float-medium select-none filter drop-shadow-[0_0_15px_rgba(0,255,204,0.3)]" title="🛸">🛸</div>
        <div className="absolute left-[11%] bottom-[25%] text-3xl animate-float-slow opacity-50 select-none" title="⭐">⭐</div>

        {/* Bottom Right */}
        <div className="absolute right-[4%] bottom-[14%] text-6xl animate-float-fast select-none filter drop-shadow-[0_0_20px_rgba(236,178,255,0.4)]" title="🪐">🪐</div>
        <div className="absolute right-[12%] bottom-[22%] text-4xl animate-float-slow opacity-60 select-none" title="🚀">🚀</div>

        {/* Top Center-Left & Center-Right */}
        <div className="absolute left-[35%] top-[4%] text-4xl animate-float-slow select-none opacity-40" title="⭐">⭐</div>
        <div className="absolute right-[35%] top-[5%] text-5xl animate-float-medium select-none opacity-50" title="🌟">🌟</div>
      </div>

      {/* 2. Page Header Wrapper */}
      <header className="bg-surface-container border-b-4 border-primary px-4 py-3 flex justify-between items-center relative z-20 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
        {/* Left branding */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-primary border-2 border-on-primary flex items-center justify-center text-on-primary animate-pulse shadow-[2px_2px_0_0_#000]">
            👚
          </div>
          <div>
            <h1 className={`font-headline-lg text-lg uppercase tracking-wider font-bold transition-all ${vaporMode ? "text-primary drop-shadow-[2px_2px_0px_#00eefc]" : "text-primary"
              }`}>
              Pick My Clothes
            </h1>
            <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
              AI Cyber-Retro Personal Stylist v1.2
            </p>
          </div>
        </div>

        {/* Right status system pills & Auth gateway key button */}
        <div className="flex items-center space-x-2.5 font-label-sm text-xs font-bold uppercase animate-fade-in">
          {/* Dedicated Login Action Button */}
          <button
            onClick={() => setActiveTab("login")}
            className={`px-3 py-1.5 border-2 flex items-center gap-1.5 cursor-pointer transition-all ${activeTab === "login"
              ? "bg-primary text-on-primary border-primary shadow-none"
              : "bg-surface-container-low text-secondary border-secondary hover:bg-secondary/10 shadow-[2px_2px_0_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${currentUserId !== null ? "bg-emerald-400" : "bg-secondary animate-pulse"}`}></span>
            <span>{currentUserId !== null ? `${profile.username.toUpperCase()}` : "🔑 LOGIN (로그인)"}</span>
          </button>

          <span className="hidden md:flex px-2.5 py-1.5 border flex items-center gap-1 bg-surface-container-low text-on-surface-variant border-outline-variant">
            <Star size={12} className="fill-current animate-spin" />
            <span>SYS_ONLINE</span>
          </span>
        </div>
      </header>

      {/* 3. Main Dashboard Layout Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Side: Profile & Navigation Columns */}
        <div className="lg:col-span-3 space-y-6">
          {/* User Profile Card */}
          <div className="bg-surface border-4 border-primary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative flex flex-col">
            {/* Title Bar */}
            <div className="bg-primary text-on-primary px-3 py-1 flex justify-between items-center border-b-4 border-primary font-bold">
              <span className="font-label-sm text-[10px] uppercase">USER_STATUS.DAT</span>
              <div className="w-2.5 h-2.5 bg-surface-bright"></div>
            </div>

            {/* Profile body content */}
            <div className="p-4 bg-surface bg-notebook flex items-center space-x-4">
              <div className="w-16 h-16 rounded-none bg-surface-container-lowest border-2 border-secondary p-0.5 overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center bg-notebook">
                <AvatarRenderer
                  avatarUrl={profile.avatarUrl}
                  size={56}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-headline-md text-sm text-secondary uppercase font-bold truncate">
                  {profile.username}
                </h3>
                <div className="flex items-center space-x-1.5 mt-1 font-label-sm text-[9px] text-on-surface-variant font-bold uppercase">
                  <span className={`w-1.5 h-1.5 rounded-full ${vaporMode ? "bg-secondary animate-ping" : "bg-outline"}`}></span>
                  <span>{vaporMode ? "VAPOR_ACTIVE" : "STANDBY"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Navigation Deck Window */}
          <div className="bg-surface border-4 border-secondary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            {/* Title Bar */}
            <div className="bg-secondary text-on-secondary-fixed px-3 py-1 flex justify-between items-center border-b-4 border-secondary font-bold">
              <span className="font-label-sm text-[10px] uppercase">NAV_DECK.DLL</span>
              <div className="w-2.5 h-2.5 bg-surface"></div>
            </div>

            {/* Navigation Options list */}
            <nav className="p-2 bg-surface-container space-y-1.5">
              {/* Home / SYS.STARTUP option */}
              <button
                onClick={() => setActiveTab("home")}
                className={`w-full text-left px-3.5 py-3 font-headline-md text-xs uppercase font-bold transition-all flex items-center justify-between border-2 cursor-pointer ${activeTab === "home"
                  ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed shadow-[2px_2px_0_0_#000] translate-x-[1px] translate-y-[1px]"
                  : "bg-surface-container text-on-surface-variant border-transparent hover:text-on-surface hover:border-outline-variant"
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <Home size={16} className={activeTab === "home" ? "text-primary shrink-0 animate-pulse" : "text-outline-variant shrink-0"} />
                  <span>SYS.STARTUP (홈)</span>
                </span>
                <span className="font-label-sm text-[9px] opacity-75 font-medium">[STARTUP]</span>
              </button>

              {/* Outfit coordinator option */}
              <button
                onClick={() => setActiveTab("outfits")}
                className={`w-full text-left px-3.5 py-3 font-headline-md text-xs uppercase font-bold transition-all flex items-center justify-between border-2 cursor-pointer ${activeTab === "outfits"
                  ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed shadow-[2px_2px_0_0_#000] translate-x-[1px] translate-y-[1px]"
                  : "bg-surface-container text-on-surface-variant border-transparent hover:text-on-surface hover:border-outline-variant"
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <Sparkles size={16} className={activeTab === "outfits" ? "text-primary shrink-0 animate-pulse" : "text-outline-variant shrink-0"} />
                  <span>오늘의 코디 추천받기</span>
                </span>
                <span className="font-label-sm text-[9px] opacity-75 font-medium">[RECO]</span>
              </button>

              {/* Closet manager option */}
              <button
                onClick={() => setActiveTab("closet")}
                className={`w-full text-left px-3.5 py-3 font-headline-md text-xs uppercase font-bold transition-all flex items-center justify-between border-2 cursor-pointer ${activeTab === "closet"
                  ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed shadow-[2px_2px_0_0_#000] translate-x-[1px] translate-y-[1px]"
                  : "bg-surface-container text-on-surface-variant border-transparent hover:text-on-surface hover:border-outline-variant"
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <Shirt size={16} className={activeTab === "closet" ? "text-primary shrink-0" : "text-outline-variant shrink-0"} />
                  <span>나의 옷장 관리</span>
                </span>
                <span className="font-label-sm text-[9px] opacity-75 font-medium">[CLOSET]</span>
              </button>

              {/* Diary calendar option */}
              <button
                onClick={() => setActiveTab("calendar")}
                className={`w-full text-left px-3.5 py-3 font-headline-md text-xs uppercase font-bold transition-all flex items-center justify-between border-2 cursor-pointer ${activeTab === "calendar"
                  ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed shadow-[2px_2px_0_0_#000] translate-x-[1px] translate-y-[1px]"
                  : "bg-surface-container text-on-surface-variant border-transparent hover:text-on-surface hover:border-outline-variant"
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <Calendar size={16} className={activeTab === "calendar" ? "text-primary shrink-0" : "text-outline-variant shrink-0"} />
                  <span>코디 다이어리 달력</span>
                </span>
                <span className="font-label-sm text-[9px] opacity-75 font-medium">[DIARY]</span>
              </button>

              {/* Stickers decoration option */}
              <button
                onClick={() => setActiveTab("stickers")}
                className={`w-full text-left px-3.5 py-3 font-headline-md text-xs uppercase font-bold transition-all flex items-center justify-between border-2 cursor-pointer ${activeTab === "stickers"
                  ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed shadow-[2px_2px_0_0_#000] translate-x-[1px] translate-y-[1px]"
                  : "bg-surface-container text-on-surface-variant border-transparent hover:text-on-surface hover:border-outline-variant"
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <Layers size={16} className={activeTab === "stickers" ? "text-primary shrink-0 animate-bounce" : "text-outline-variant shrink-0"} />
                  <span>스티커 다이어리</span>
                </span>
                <span className="font-label-sm text-[9px] opacity-75 font-medium">[STICKERS]</span>
              </button>

              {/* System Configuration option */}
              <button
                onClick={() => setActiveTab("system")}
                className={`w-full text-left px-3.5 py-3 font-headline-md text-xs uppercase font-bold transition-all flex items-center justify-between border-2 cursor-pointer ${activeTab === "system"
                  ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed shadow-[2px_2px_0_0_#000] translate-x-[1px] translate-y-[1px]"
                  : "bg-surface-container text-on-surface-variant border-transparent hover:text-on-surface hover:border-outline-variant"
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <Settings size={16} className={activeTab === "system" ? "text-primary shrink-0" : "text-outline-variant shrink-0"} />
                  <span>시스템 설정</span>
                </span>
                <span className="font-label-sm text-[9px] opacity-75 font-medium">[SYS_CONF]</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Right Side: Main Screen Panel Content */}
        <div className="lg:col-span-9">
          {activeTab === "home" && (
            <HomeTab
              closet={closet}
              onNavigate={(tab) => setActiveTab(tab)}
              albumCoverUrl={vibeAlbumCover}
            />
          )}

          {activeTab === "closet" && (
            <ClosetTab
              closet={closet}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {activeTab === "outfits" && (
            <OutfitsTab
              closet={closet}
              savedStyles={savedStyles}
              isLoggedIn={isUserLoggedIn()}
              onSaveOutfit={handleSaveOutfit}
              onDeleteOutfit={handleDeleteOutfit}
              onAddItem={handleAddItem}
            />
          )}

          {activeTab === "calendar" && (
            <CalendarTab
              savedStyles={savedStyles}
              calendarEvents={calendarEvents}
              onAddEvent={handleAddCalendarEvent}
              onRemoveEvent={handleRemoveCalendarEvent}
            />
          )}

          {activeTab === "stickers" && (
            <StickersTab
              closet={closet}
              stickerDiaries={stickerDiaries}
              onSaveStickerDiary={handleSaveStickerDiary}
              onDeleteStickerDiary={handleDeleteStickerDiary}
            />
          )}

          {activeTab === "system" && (
            <SystemTab
              profile={profile}
              onChangeProfile={handleProfileChange}
              vaporMode={vaporMode}
              onToggleVaporMode={handleToggleVaporMode}
              scanlineOpacity={scanlineOpacity}
              onChangeScanline={handleScanlineChange}
              onResetApp={handleResetApp}
            />
          )}

          {activeTab === "login" && (
            <LoginPanel
              profile={profile}
              onChangeProfile={handleProfileChange}
              vaporMode={vaporMode}
              onNavigateToHome={() => setActiveTab("home")}
            />
          )}
        </div>
      </main>

      {/* 4. Elegant Cyber Footer */}
      <footer className="bg-surface border-t-2 border-outline-variant text-on-surface-variant py-4 px-6 mt-auto text-center font-label-sm text-[10px] uppercase font-bold relative z-20">
        <p>© 2026 PICK MY CLOTHES INC. • ALL SYSTEM RIGHTS CONFIGURED PERFECTLY • SYSTEM STATUS: ONLINE</p>
      </footer>
    </div>
  );
}
