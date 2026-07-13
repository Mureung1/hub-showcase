import React, { useState, useEffect } from "react";
import { Sparkles, FileUp, Heart, Terminal } from "lucide-react";
import { ClothingItem } from "../types";
// @ts-ignore
import homeBottomBanner from "../assets/images/home_bottom_banner_1783932662102.jpg";

interface HomeTabProps {
  closet: ClothingItem[];
  onNavigate: (tab: "closet" | "outfits" | "calendar" | "stickers" | "system") => void;
  albumCoverUrl?: string;
}

export default function HomeTab({ closet, onNavigate, albumCoverUrl }: HomeTabProps) {
  const [currentMood, setCurrentMood] = useState<string>("Chill Wave");
  const [typedCommand, setTypedCommand] = useState<string>("./scan_closet.sh --analyze-trends");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "SYS.INIT // Booting cybernetic style engine...",
    "DB_LOAD // Loaded closet_registry.db with 4 entries",
    "AESTHETIC_MATCH // Vibe set to [VAPOR_WAVE]",
    "SYSTEM READY // Waiting for coordinate action..."
  ]);
  const [activeLogIndex, setActiveLogIndex] = useState<number>(0);

  // Dynamic terminal logs based on current closet content
  useEffect(() => {
    const totalTops = closet.filter(i => i.category === "top").length;
    const totalBottoms = closet.filter(i => i.category === "bottom").length;
    const totalShoes = closet.filter(i => i.category === "shoes").length;
    const totalAcc = closet.filter(i => i.category === "accessories").length;

    const dynamicLogs = [
      `SYS.INIT // Booting cybernetic style engine v1.2...`,
      `DB_LOAD // Registered: ${totalTops} Tops, ${totalBottoms} Bottoms, ${totalShoes} Shoes, ${totalAcc} Accessories.`,
      `COMPUTING_RATIOS // Wardrobe density: ${closet.length > 5 ? "STABLE" : "EXPANDABLE"}.`,
      `AESTHETIC_MATCH // Current environment mode: [VAPOR_ACTIVE]`,
      `root@diary:~# ./scan_closet.sh --analyze-trends`
    ];

    setTerminalLogs(dynamicLogs);
  }, [closet]);

  // Blink caret effect for the terminal command line
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLogIndex(prev => (prev + 1) % terminalLogs.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [terminalLogs]);

  // Fallback cover if none is passed or generated
  const coverImg = albumCoverUrl || "https://picsum.photos/seed/cyberpunk/400/400";

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Main Header section mimicking ★ SYS.STARTUP */}
      <div className="flex items-center space-x-3 mb-1">
        <div className="text-[#00eefc] drop-shadow-[0_0_10px_#00eefc]">
          <span className="text-3xl font-bold">★</span>
        </div>
        <h2 className="font-headline-lg text-2xl font-bold text-primary tracking-widest uppercase drop-shadow-[2px_2px_0px_#9900cf]">
          SYS.STARTUP
        </h2>
      </div>

      {/* Cyber/Vapor Welcome Banner with green double border outline */}
      <div className="border-4 border-[#00ffcc] bg-surface-container-lowest p-3 shadow-[0_0_15px_rgba(0,255,204,0.15)] relative">
        <div className="border-2 border-dashed border-[#00ffcc]/50 p-2 text-center">
          <p className="font-label-sm text-xs md:text-sm text-[#00ffcc] tracking-widest font-bold">
            디지털 스타일 로그에 오신 것을 환영합니다 // Welcome to your digital style log
          </p>
        </div>
      </div>

      {/* 3-Column Grid mimicking the screenshot layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Card 1: Coordination Start */}
        <div className="md:col-span-4 group cursor-pointer" onClick={() => onNavigate("outfits")}>
          <div className="bg-surface border-4 border-primary p-7 relative min-h-[290px] h-full transition-all hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[10px_10px_0px_0px_rgba(236,178,255,0.4)] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            {/* Top Badge */}
            <div className="absolute top-3 right-3 border border-primary px-2 py-0.5 bg-surface-container-low">
              <span className="font-label-sm text-[10px] text-primary uppercase font-bold tracking-widest">ACTION</span>
            </div>

            {/* Icon */}
            <div className="w-16 h-16 border-4 border-primary/40 bg-surface-container-high/40 flex items-center justify-center text-primary mb-6 group-hover:scale-105 transition-transform">
              <Sparkles size={36} className="animate-pulse" />
            </div>

            {/* Title & Description */}
            <div>
              <h3 className="font-headline-md text-xl md:text-2xl text-secondary uppercase font-bold tracking-tight">
                Coordination Start
              </h3>
              <p className="font-label-sm text-sm text-on-surface-variant font-bold mt-2">
                코디 추천 시작 ★
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Upload Closet */}
        <div className="md:col-span-4 group cursor-pointer" onClick={() => onNavigate("closet")}>
          <div className="bg-surface border-4 border-primary p-7 relative min-h-[290px] h-full transition-all hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[10px_10px_0px_0px_rgba(236,178,255,0.4)] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            {/* Top Badge */}
            <div className="absolute top-3 right-3 border border-primary px-2 py-0.5 bg-surface-container-low">
              <span className="font-label-sm text-[10px] text-primary uppercase font-bold tracking-widest">INPUT</span>
            </div>

            {/* Icon */}
            <div className="w-16 h-16 border-4 border-primary/40 bg-surface-container-high/40 flex items-center justify-center text-primary mb-6 group-hover:scale-105 transition-transform">
              <FileUp size={36} />
            </div>

            {/* Title & Description */}
            <div>
              <h3 className="font-headline-md text-xl md:text-2xl text-secondary uppercase font-bold tracking-tight">
                Upload Closet
              </h3>
              <p className="font-label-sm text-sm text-on-surface-variant font-bold mt-2">
                나의 옷장 업로드 ★
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: VIBE.EXE Widget */}
        <div className="md:col-span-4">
          <div className="bg-surface border-4 border-[#00eefc] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative flex flex-col min-h-[290px] h-full justify-between">
            {/* Custom Windows Title Bar */}
            <div className="bg-[#00eefc] text-[#002022] px-3 py-1.5 flex justify-between items-center border-b-4 border-[#00eefc] font-bold">
              <span className="font-label-sm text-[11px] uppercase tracking-wider">VIBE.EXE</span>
              {/* Retro Minimize, Maximize, Close indicators */}
              <div className="flex space-x-1">
                <div className="w-4 h-4 border border-[#002022] bg-[#f8d8ff] flex items-center justify-center text-[9px] font-bold">_</div>
                <div className="w-4 h-4 border border-[#002022] bg-[#bd00ff] flex items-center justify-center text-[9px] font-bold">□</div>
                <div className="w-4 h-4 border border-[#002022] bg-[#ffb4ab] flex items-center justify-center text-[9px] font-bold">X</div>
              </div>
            </div>

            {/* Window Content */}
            <div className="p-5 bg-surface-container flex flex-col items-center justify-center flex-1">
              {/* Music Album cover style */}
              <div className="w-36 h-36 border-4 border-[#ecb2ff] p-1 bg-[#160231] relative overflow-hidden shadow-[4px_4px_0px_#000] mb-3.5 group">
                <img
                  src={coverImg}
                  alt="Vibe Album Cover"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-1 right-1">
                  <Heart size={14} className="fill-red-500 text-red-500 animate-pulse" />
                </div>
              </div>

              {/* Status details */}
              <div className="w-full text-center space-y-1.5">
                <p className="font-label-sm text-[10px] text-[#00eefc]/70 uppercase tracking-widest font-bold">
                  CURRENT MOOD
                </p>
                {/* Interactive Vibe Input */}
                <div className="relative flex items-center justify-center">
                  <span className="text-[#00eefc] font-mono text-sm mr-1">&gt;</span>
                  <input
                    type="text"
                    value={currentMood}
                    onChange={(e) => setCurrentMood(e.target.value)}
                    className="bg-transparent text-[#00eefc] font-mono text-sm text-center border-b border-[#00eefc]/30 focus:border-[#00eefc] outline-none max-w-[130px] py-0.5 font-bold uppercase tracking-wider"
                    maxLength={16}
                  />
                  <span className="cursor-blink"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Terminal Console Box */}
      <div className="border-4 border-outline bg-surface-container-lowest p-6 font-mono text-sm text-[#ecb2ff] shadow-[8px_8px_0px_rgba(0,0,0,1)] relative overflow-hidden">
        <div className="flex items-center space-x-3 border-b border-outline-variant pb-3 mb-3">
          <Terminal size={18} className="text-secondary shrink-0" />
          <span className="font-label-sm text-xs text-on-surface-variant font-bold tracking-widest uppercase">
            STYLING_CONSOLE_FEED.DAT
          </span>
        </div>

        {/* Console lines content */}
        <div className="space-y-1.5 min-h-[110px] select-text">
          {terminalLogs.slice(0, activeLogIndex + 1).map((log, idx) => (
            <p key={idx} className={idx === activeLogIndex ? "text-secondary font-bold" : "text-[#ecb2ff]/70"}>
              {log}
            </p>
          ))}
          {activeLogIndex < terminalLogs.length - 1 && (
            <p className="text-on-surface-variant/40 italic animate-pulse">
              Scanning wardrobe parameters...
            </p>
          )}
        </div>
      </div>

      {/* Dynamic Cyberpunk Wardrobe Banner Graphic */}
      <div className="border-4 border-primary bg-surface shadow-[8px_8px_0px_#000] relative overflow-hidden flex flex-col">
        {/* Title Bar */}
        <div className="bg-primary text-on-primary px-3 py-1.5 flex justify-between items-center font-bold">
          <span className="font-label-sm text-xs uppercase tracking-wider">CYBER_WARDROBE_DATABASE_PREVIEW.IMG (100%)</span>
          {/* Retro Window buttons */}
          <div className="flex space-x-1">
            <div className="w-4 h-4 border border-on-primary bg-surface-container-low flex items-center justify-center text-[9px] font-bold text-on-surface">_</div>
            <div className="w-4 h-4 border border-on-primary bg-surface-container-high flex items-center justify-center text-[9px] font-bold text-on-surface">□</div>
            <div className="w-4 h-4 border border-on-primary bg-[#ffb4ab] text-black flex items-center justify-center text-[9px] font-bold">X</div>
          </div>
        </div>
        <div className="p-1.5 bg-[#160231] relative">
          <img
            src={homeBottomBanner}
            alt="Cyber Retro Wardrobe Pixel Art"
            className="w-full h-auto object-cover border-2 border-[#ecb2ff]/40 max-h-[460px]"
            referrerPolicy="no-referrer"
          />
          {/* Subtle Cyber overlay scanline overlay on banner */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00eefc]/5 to-transparent pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
}
