import React, { useState, useEffect } from "react";
import { ClothingItem, SavedOutfit, CalendarEvent, UserProfile } from "./types";
import { DEFAULT_CLOSET } from "./data/presets";
import HomeTab from "./components/HomeTab";
import ClosetTab from "./components/ClosetTab";
import OutfitsTab from "./components/OutfitsTab";
import CalendarTab from "./components/CalendarTab";
import StickersTab from "./components/StickersTab";
import SystemTab from "./components/SystemTab";
import { Shirt, Sparkles, Calendar, Heart, Settings, Star, Layers, Home } from "lucide-react";

const vibeAlbumCover = "/src/assets/images/vibe_album_cover_1783930828089.jpg";

export default function App() {
  // Navigation / Active Screen state
  const [activeTab, setActiveTab] = useState<"home" | "closet" | "outfits" | "calendar" | "stickers" | "system">("home");

  // Database states with LocalStorage persistence
  const [closet, setCloset] = useState<ClothingItem[]>([]);
  const [savedStyles, setSavedStyles] = useState<SavedOutfit[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    username: "Cyber Stylist",
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC_ZjodRFQ4in2ugvOwdg9HS3O9GqRKAcNZo6pWFUJj7Al2QQ_X0pyEJwyDxKXcNTlnqdPNGCeNtGKyYvAmL4V6DzL4FL0jTJCiDKf2ub1JccW-4TS4Jor4GFwmPS33MmzKiiRv3iVProMp1rKFV3WqXQB4ANRPrpGC8enkxa7DNCYrpKPF_-NiqhCbLB9y_nvhpAV7tX98P4KohN47RdwdKD-k_OWb5pgeGTipRRUb9TYSgUUmBRdrjnp9EI-hulYNoVQhHtS6pMlU"
  });

  // Aesthetic Modulator states
  const [vaporMode, setVaporMode] = useState<boolean>(true);
  const [scanlineOpacity, setScanlineOpacity] = useState<number>(0.15);

  // Initialize data on mount
  useEffect(() => {
    // 1. Closet setup
    const storedCloset = localStorage.getItem("pmc_closet");
    if (storedCloset) {
      setCloset(JSON.parse(storedCloset));
    } else {
      localStorage.setItem("pmc_closet", JSON.stringify(DEFAULT_CLOSET));
      setCloset(DEFAULT_CLOSET);
    }

    // 2. Saved outfits setup
    const storedStyles = localStorage.getItem("pmc_saved_styles");
    if (storedStyles) {
      setSavedStyles(JSON.parse(storedStyles));
    }

    // 3. Calendar events setup
    const storedEvents = localStorage.getItem("pmc_calendar_events");
    if (storedEvents) {
      setCalendarEvents(JSON.parse(storedEvents));
    }

    // 4. User profile setup
    const storedProfile = localStorage.getItem("pmc_profile");
    if (storedProfile) {
      setProfile(JSON.parse(storedProfile));
    }

    // 5. Aesthetic setup
    const storedVapor = localStorage.getItem("pmc_vapor_mode");
    if (storedVapor !== null) {
      setVaporMode(storedVapor === "true");
    }

    const storedScanlines = localStorage.getItem("pmc_scanline_opacity");
    if (storedScanlines !== null) {
      setScanlineOpacity(parseFloat(storedScanlines));
    }
  }, []);

  // Sync state functions with auto-save to storage
  const handleAddItem = (item: ClothingItem) => {
    const updated = [item, ...closet];
    setCloset(updated);
    localStorage.setItem("pmc_closet", JSON.stringify(updated));
  };

  const handleDeleteItem = (id: string) => {
    const updated = closet.filter(item => item.id !== id);
    setCloset(updated);
    localStorage.setItem("pmc_closet", JSON.stringify(updated));
  };

  const handleSaveOutfit = (outfit: SavedOutfit) => {
    const updated = [outfit, ...savedStyles];
    setSavedStyles(updated);
    localStorage.setItem("pmc_saved_styles", JSON.stringify(updated));
  };

  const handleDeleteOutfit = (id: string) => {
    const updated = savedStyles.filter(o => o.id !== id);
    setSavedStyles(updated);
    localStorage.setItem("pmc_saved_styles", JSON.stringify(updated));

    // Also cascade delete related calendar schedules on that outfit
    const updatedEvents = calendarEvents.filter(e => e.outfitId !== id);
    setCalendarEvents(updatedEvents);
    localStorage.setItem("pmc_calendar_events", JSON.stringify(updatedEvents));
  };

  const handleAddCalendarEvent = (date: string, outfitId: string) => {
    // Overwrite if date already has schedule
    const base = calendarEvents.filter(e => e.date !== date);
    const updated = [...base, { date, outfitId }];
    setCalendarEvents(updated);
    localStorage.setItem("pmc_calendar_events", JSON.stringify(updated));
  };

  const handleRemoveCalendarEvent = (date: string) => {
    const updated = calendarEvents.filter(e => e.date !== date);
    setCalendarEvents(updated);
    localStorage.setItem("pmc_calendar_events", JSON.stringify(updated));
  };

  const handleProfileChange = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem("pmc_profile", JSON.stringify(updatedProfile));
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
    setProfile({
      username: "Cyber Stylist",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC_ZjodRFQ4in2ugvOwdg9HS3O9GqRKAcNZo6pWFUJj7Al2QQ_X0pyEJwyDxKXcNTlnqdPNGCeNtGKyYvAmL4V6DzL4FL0jTJCiDKf2ub1JccW-4TS4Jor4GFwmPS33MmzKiiRv3iVProMp1rKFV3WqXQB4ANRPrpGC8enkxa7DNCYrpKPF_-NiqhCbLB9y_nvhpAV7tX98P4KohN47RdwdKD-k_OWb5pgeGTipRRUb9TYSgUUmBRdrjnp9EI-hulYNoVQhHtS6pMlU"
    });
    setVaporMode(true);
    setScanlineOpacity(0.15);
    alert("시스템 레지스트리 및 데이터베이스가 완전히 초기화되었습니다! ⚙️");
    setActiveTab("outfits");
  };

  return (
    <div className={`min-h-screen text-on-surface bg-background flex flex-col font-body-md selection:bg-primary selection:text-on-primary transition-all relative overflow-x-hidden ${
      vaporMode ? "shadow-[inset_0_0_80px_rgba(153,0,207,0.15)]" : ""
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
            <h1 className={`font-headline-lg text-lg uppercase tracking-wider font-bold transition-all ${
              vaporMode ? "text-primary drop-shadow-[2px_2px_0px_#00eefc]" : "text-primary"
            }`}>
              Pick My Clothes
            </h1>
            <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
              AI Cyber-Retro Personal Stylist v1.2
            </p>
          </div>
        </div>

        {/* Right status system pills */}
        <div className="hidden sm:flex items-center space-x-3 font-label-sm text-xs font-bold uppercase">
          <span className={`px-2.5 py-1 border flex items-center gap-1 bg-surface-container-low ${
            vaporMode ? "text-secondary border-secondary" : "text-on-surface-variant border-outline-variant"
          }`}>
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
            <span>VAPOR_SYSTEM_LINKED</span>
          </span>
          <span className="px-2.5 py-1 border border-primary text-primary bg-surface-container-low flex items-center gap-1">
            <Star size={12} className="fill-current animate-spin" />
            <span>AI_CORE_ONLINE</span>
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
              <div className="w-16 h-16 rounded-none bg-surface-container-lowest border-2 border-secondary p-0.5 overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <img
                  src={profile.avatarUrl}
                  alt={profile.username}
                  className="w-full h-full object-cover"
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
                className={`w-full text-left px-3.5 py-3 font-headline-md text-xs uppercase font-bold transition-all flex items-center justify-between border-2 cursor-pointer ${
                  activeTab === "home"
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
                className={`w-full text-left px-3.5 py-3 font-headline-md text-xs uppercase font-bold transition-all flex items-center justify-between border-2 cursor-pointer ${
                  activeTab === "outfits"
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
                className={`w-full text-left px-3.5 py-3 font-headline-md text-xs uppercase font-bold transition-all flex items-center justify-between border-2 cursor-pointer ${
                  activeTab === "closet"
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
                className={`w-full text-left px-3.5 py-3 font-headline-md text-xs uppercase font-bold transition-all flex items-center justify-between border-2 cursor-pointer ${
                  activeTab === "calendar"
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
                className={`w-full text-left px-3.5 py-3 font-headline-md text-xs uppercase font-bold transition-all flex items-center justify-between border-2 cursor-pointer ${
                  activeTab === "stickers"
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
                className={`w-full text-left px-3.5 py-3 font-headline-md text-xs uppercase font-bold transition-all flex items-center justify-between border-2 cursor-pointer ${
                  activeTab === "system"
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
              onSaveOutfit={handleSaveOutfit}
              onDeleteOutfit={handleDeleteOutfit}
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
            <StickersTab closet={closet} />
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
        </div>
      </main>

      {/* 4. Elegant Cyber Footer */}
      <footer className="bg-surface border-t-2 border-outline-variant text-on-surface-variant py-4 px-6 mt-auto text-center font-label-sm text-[10px] uppercase font-bold relative z-20">
        <p>© 2026 PICK MY CLOTHES INC. • ALL SYSTEM RIGHTS CONFIGURED PERFECTLY • SYSTEM STATUS: ONLINE</p>
      </footer>
    </div>
  );
}
