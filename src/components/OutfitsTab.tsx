import React, { useState } from "react";
import { ClothingItem, WeatherType, DestinationType, SituationType, SavedOutfit } from "../types";
import { Sun, Cloud, CloudRain, Snowflake, Coffee, GraduationCap, Briefcase, Sparkles, Home, Heart, Dumbbell, Gamepad2, RefreshCw, Save, ChevronRight, Terminal, Star, Trash2 } from "lucide-react";

interface OutfitsTabProps {
  closet: ClothingItem[];
  savedStyles: SavedOutfit[];
  onSaveOutfit: (outfit: SavedOutfit) => void;
  onDeleteOutfit: (id: string) => void;
}

export default function OutfitsTab({ closet, savedStyles, onSaveOutfit, onDeleteOutfit }: OutfitsTabProps) {
  const [subTab, setSubTab] = useState<"recommend" | "saved">("recommend");

  // Selection states
  const [weather, setWeather] = useState<WeatherType>("sun");
  const [destination, setDestination] = useState<DestinationType>("cafe");
  const [situation, setSituation] = useState<SituationType>("casual");

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingLog, setLoadingLog] = useState<string[]>([]);

  // Recommendation outputs
  const [resultOutfit, setResultOutfit] = useState<SavedOutfit | null>(null);

  // Helper mappings
  const weatherIcons: Record<WeatherType, React.ReactNode> = {
    sun: <Sun size={28} />,
    cloud: <Cloud size={28} />,
    rain: <CloudRain size={28} />,
    snow: <Snowflake size={28} />
  };

  const destIcons: Record<DestinationType, React.ReactNode> = {
    cafe: <Coffee size={24} />,
    school: <GraduationCap size={24} />,
    office: <Briefcase size={24} />,
    party: <Sparkles size={24} />,
    home: <Home size={24} />
  };

  const sitIcons: Record<SituationType, React.ReactNode> = {
    date: <Heart size={24} />,
    workout: <Dumbbell size={24} />,
    casual: <Gamepad2 size={24} />,
    formal: <Briefcase size={24} />
  };

  // Run Recommendation Request
  const handleRecommend = async () => {
    setIsLoading(true);
    setLoadingStep(0);
    setResultOutfit(null);
    setLoadingLog(["> SYSTEM: Initiating outfit coordination sequence..."]);

    const steps = [
      { delay: 400, text: "> SYSTEM: Reading closet items database..." },
      { delay: 800, text: `> SYSTEM: Setting environmental parameters: weather=${weather}, location=${destination}` },
      { delay: 1200, text: `> SYSTEM: Parsing social coordinates: situation=${situation}` },
      { delay: 1600, text: "> SYSTEM: Accessing neural styling grid. Connecting to AI stylist core..." },
      { delay: 2000, text: "> SYSTEM: Optimizing fashion aesthetic... Compiling final coordinate..." }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setLoadingStep((idx + 1) * 20);
        setLoadingLog(prev => [...prev, step.text]);
      }, step.delay);
    });

    setTimeout(async () => {
      try {
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weather,
            destination,
            situation,
            closet
          })
        });

        const data = await response.json();

        // Map item IDs to actual clothing objects
        const topItem = closet.find(item => item.id === data.topId) || closet.find(item => item.category === 'top');
        const bottomItem = closet.find(item => item.id === data.bottomId) || closet.find(item => item.category === 'bottom');
        const shoesItem = closet.find(item => item.id === data.shoesId) || closet.find(item => item.category === 'shoes');
        const accessoriesItem = closet.find(item => item.id === data.accessoriesId) || closet.find(item => item.category === 'accessories');

        const recommendedOutfit: SavedOutfit = {
          id: "outfit-" + Date.now(),
          weather,
          destination,
          situation,
          items: {
            top: topItem,
            bottom: bottomItem,
            shoes: shoesItem,
            accessories: accessoriesItem
          },
          stylistNote: data.stylistNote || "> SYSTEM: Core compiled successfully.",
          savedAt: new Date().toISOString()
        };

        setResultOutfit(recommendedOutfit);
        setLoadingStep(100);
      } catch (err) {
        console.error("AI Stylist Error:", err);
        setLoadingLog(prev => [...prev, "> ERROR: Stylist neural network failed. Returning dry recommendation..."]);
      } finally {
        setIsLoading(false);
      }
    }, 2400);
  };

  const handleSaveToDiary = () => {
    if (resultOutfit) {
      onSaveOutfit(resultOutfit);
      alert("스타일이 코디 다이어리에 성공적으로 저장되었습니다! 💖");
      setSubTab("saved");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Tab Switcher */}
      <div className="flex border-b-4 border-outline-variant">
        <button
          onClick={() => setSubTab("recommend")}
          className={`px-6 py-3 font-headline-md text-sm uppercase tracking-wider transition-all border-t-4 border-x-4 ${
            subTab === "recommend"
              ? "bg-surface-container text-primary border-primary -mb-[4px] z-10 font-bold"
              : "bg-surface text-on-surface-variant border-transparent hover:text-on-surface"
          }`}
        >
          COORDINATION START (코디 추천)
        </button>
        <button
          onClick={() => setSubTab("saved")}
          className={`px-6 py-3 font-headline-md text-sm uppercase tracking-wider transition-all border-t-4 border-x-4 ${
            subTab === "saved"
              ? "bg-surface-container text-primary border-primary -mb-[4px] z-10 font-bold"
              : "bg-surface text-on-surface-variant border-transparent hover:text-on-surface"
          }`}
        >
          SAVED STYLES (저장된 스타일 목록: {savedStyles.length})
        </button>
      </div>

      {subTab === "recommend" ? (
        <>
          {!resultOutfit && !isLoading && (
            <div className="bg-surface border-4 border-primary shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative flex flex-col">
              {/* Header Bar */}
              <div className="bg-primary text-on-primary px-3 py-2 flex justify-between items-center border-b-4 border-primary">
                <div className="font-label-sm text-label-sm uppercase flex items-center space-x-2 font-bold">
                  <span className="material-symbols-outlined text-[16px]">terminal</span>
                  <span>COORD_SELECTION.EXE</span>
                </div>
                <div className="flex space-x-1">
                  <div className="w-4 h-4 bg-surface border-2 border-on-primary"></div>
                  <div className="w-4 h-4 bg-surface border-2 border-on-primary"></div>
                  <div className="w-4 h-4 bg-error border-2 border-on-primary"></div>
                </div>
              </div>

              {/* Param Form Content */}
              <div className="p-6 md:p-10 bg-surface-dim bg-notebook">
                <h1 className="font-headline-lg text-headline-lg text-secondary mb-12 uppercase drop-shadow-[4px_4px_0_rgba(153,0,207,1)] text-center tracking-tight font-bold">
                  SETUP PARAMETERS
                </h1>

                <div className="space-y-10">
                  {/* Weather Selection */}
                  <div className="relative">
                    <div className="absolute -left-3 -top-5 text-primary opacity-30 font-headline-lg text-5xl select-none font-bold">01</div>
                    <div className="border-2 border-outline-variant bg-surface-container p-6 relative z-10 shadow-[4px_4px_0_0_#3e2c5a]">
                      <h3 className="font-headline-md text-lg text-primary mb-5 flex items-center space-x-2 font-bold">
                        <span className="material-symbols-outlined">partly_cloudy_day</span>
                        <span>WEATHER [날씨 상황]</span>
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(["sun", "cloud", "rain", "snow"] as const).map((w) => (
                          <div key={w} className="relative">
                            <button
                              type="button"
                              onClick={() => setWeather(w)}
                              className={`w-full text-center border-2 p-4 cursor-pointer transition-all font-label-sm uppercase font-bold flex flex-col items-center justify-center gap-2 ${
                                weather === w
                                  ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed shadow-none translate-x-[2px] translate-y-[2px]"
                                  : "bg-surface text-primary border-primary shadow-[4px_4px_0_0_#bd00ff] hover:bg-surface-variant"
                              }`}
                            >
                              {weatherIcons[w]}
                              <span className="text-xs">{w}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Destination Selection */}
                  <div className="relative">
                    <div className="absolute -left-3 -top-5 text-secondary opacity-30 font-headline-lg text-5xl select-none font-bold">02</div>
                    <div className="border-2 border-outline-variant bg-surface-container p-6 relative z-10 shadow-[4px_4px_0_0_#3e2c5a]">
                      <h3 className="font-headline-md text-lg text-secondary mb-5 flex items-center space-x-2 font-bold">
                        <span className="material-symbols-outlined">map</span>
                        <span>DESTINATION [목적지 장소]</span>
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {(["cafe", "school", "office", "party", "home"] as const).map((d) => (
                          <div key={d} className="relative col-span-1">
                            <button
                              type="button"
                              onClick={() => setDestination(d)}
                              className={`w-full text-center border-2 p-3.5 cursor-pointer transition-all font-label-sm uppercase font-bold flex flex-col items-center justify-center gap-1.5 ${
                                destination === d
                                  ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed shadow-none translate-x-[2px] translate-y-[2px]"
                                  : "bg-surface text-secondary border-secondary shadow-[4px_4px_0_0_#00eefc] hover:bg-surface-variant"
                              }`}
                            >
                              {destIcons[d]}
                              <span className="text-xs">{d}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Situation Selection */}
                  <div className="relative">
                    <div className="absolute -left-3 -top-5 text-tertiary opacity-30 font-headline-lg text-5xl select-none font-bold">03</div>
                    <div className="border-2 border-outline-variant bg-surface-container p-6 relative z-10 shadow-[4px_4px_0_0_#3e2c5a]">
                      <h3 className="font-headline-md text-lg text-tertiary mb-5 flex items-center space-x-2 font-bold">
                        <span className="material-symbols-outlined">theater_comedy</span>
                        <span>SITUATION [상황/목적]</span>
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(["date", "workout", "casual", "formal"] as const).map((s) => (
                          <div key={s} className="relative">
                            <button
                              type="button"
                              onClick={() => setSituation(s)}
                              className={`w-full text-center border-2 p-3.5 cursor-pointer transition-all font-label-sm uppercase font-bold flex flex-col items-center justify-center gap-1.5 ${
                                situation === s
                                  ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed shadow-none translate-x-[2px] translate-y-[2px]"
                                  : "bg-surface text-tertiary border-tertiary shadow-[4px_4px_0_0_#8f64ad] hover:bg-surface-variant"
                              }`}
                            >
                              {sitIcons[s]}
                              <span className="text-xs">{s}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Big Coordinator Button */}
                <div className="pt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={handleRecommend}
                    className="group bg-secondary-container text-on-secondary-container font-headline-md text-2xl px-8 py-5 border-4 border-on-secondary-fixed shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none transition-all uppercase tracking-widest flex items-center space-x-3 font-bold cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-3xl animate-spin text-primary">magic_button</span>
                    <span>추천 결과 보기</span>
                    <span className="text-sm opacity-80 font-label-sm tracking-normal font-medium ml-2">[SHOW MY OUTFIT]</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loader Sequence */}
          {isLoading && (
            <div className="bg-[#1a0b2e] border-4 border-secondary p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative min-h-[400px] flex flex-col justify-between">
              <div className="flex justify-between items-center border-b-2 border-dashed border-outline-variant pb-4 mb-4">
                <h3 className="font-label-sm text-sm text-secondary uppercase flex items-center gap-2">
                  <Terminal size={16} className="animate-pulse text-secondary-container" />
                  <span>STYLIST_NEURAL_ALIGNMENT.SYS</span>
                </h3>
                <span className="font-label-sm text-xs text-on-surface-variant">LOADING: {loadingStep}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface-container border-2 border-primary h-6 p-1 flex items-center">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${loadingStep}%` }}
                ></div>
              </div>

              {/* Terminal Logs scroll */}
              <div className="flex-1 bg-surface-container-lowest border border-outline-variant p-4 font-label-sm text-xs text-secondary-container space-y-2 mt-6 overflow-y-auto min-h-[180px] leading-relaxed">
                {loadingLog.map((log, idx) => (
                  <p key={idx}>{log}</p>
                ))}
                <span className="cursor-blink"></span>
              </div>

              <div className="mt-6 text-center font-label-sm text-xs text-on-surface-variant animate-pulse uppercase">
                &gt;&gt; SECURING DIGITAL ENVIRONMENT &amp; COMPILING COORDINATE PRESETS &lt;&lt;
              </div>
            </div>
          )}

          {/* AI Recommendation Result Page */}
          {resultOutfit && !isLoading && (
            <div className="bg-surface-container border-4 border-primary shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative flex flex-col">
              {/* Window Header */}
              <div className="bg-primary px-4 py-2 flex justify-between items-center border-b-2 border-primary">
                <h2 className="font-headline-md text-headline-md text-on-primary uppercase flex items-center gap-2 font-bold text-lg">
                  <Sparkles size={18} className="animate-spin text-on-primary" />
                  <span>오늘의 추천 코디 (TODAY'S FIT)</span>
                </h2>
                <div className="flex space-x-1.5">
                  <div className="w-3.5 h-3.5 bg-surface border border-on-primary"></div>
                  <div className="w-3.5 h-3.5 bg-surface border border-on-primary"></div>
                  <div className="w-3.5 h-3.5 bg-surface border border-on-primary"></div>
                </div>
              </div>

              <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 dither-bg">
                {/* Left Column: Composite Image Showcase */}
                <div className="lg:col-span-5 relative flex flex-col items-center">
                  <div className="w-full aspect-[3/4] border-4 border-tertiary bg-surface-container-lowest shadow-[6px_6px_0px_0px_rgba(226,181,255,0.4)] overflow-hidden relative group">
                    <div className="absolute inset-0 bg-secondary opacity-[0.08] mix-blend-overlay pointer-events-none z-10"></div>

                    {/* Central Base Model Illustration */}
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrJmy9_ANaxY4pSkSSkMUYcLsa6fBh-glUNGTQAtkwTe5XlSke2vAMekwxWafqUsZti4vCQT29TNiZLanTB-m-6FK8XPms1NzW3HNa7yb5uSMziWjLQ6yxDPay8Y6Fk1fTfcAPL1T9Al8qnP1yYc0Fx_rXqNrh7dyAnz2fsoT6ptN3cpJeQ5sKFCzddEnD1AAIQnO0NTRfEfsQLgews9Sinp9rsG72TFXt2JsUWln2s4Q9DS9ieRcfQRbrH6oCmkVYL8YvV5B8Qg-i"
                      alt="Cyber Model base"
                      className="w-full h-full object-cover transition-transform duration-500"
                    />

                    {/* Floating stickers animations overlay */}
                    <div className="absolute top-4 left-4 p-2 bg-surface-container-highest border-2 border-secondary rotate-[-10deg] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-20 animate-bounce">
                      <span className="font-label-sm text-secondary text-sm font-bold flex items-center gap-1">💖 PILL</span>
                    </div>
                    <div className="absolute bottom-4 right-4 p-2 bg-surface-container-highest border-2 border-tertiary rotate-[15deg] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-20 animate-pulse">
                      <Star size={16} className="text-tertiary fill-current" />
                    </div>

                    {/* Miniature overlays of recommended clothes on corners */}
                    <div className="absolute bottom-4 left-4 bg-surface-container p-1 border-2 border-primary z-20 flex flex-col gap-1 text-[9px] font-label-sm text-primary uppercase font-bold">
                      <span className="px-1 bg-primary text-on-primary">W:{resultOutfit.weather}</span>
                      <span className="px-1 bg-surface-container-highest border border-outline-variant">D:{resultOutfit.destination}</span>
                    </div>
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={() => setResultOutfit(null)}
                    className="mt-4 px-6 py-2.5 bg-surface border-2 border-secondary text-secondary hover:bg-secondary hover:text-on-secondary-fixed transition-colors font-headline-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_#000] cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>코디 다시 짜기 (SELECT DIFFERENT INPUTS)</span>
                  </button>
                </div>

                {/* Right Column: Style stack info, note, diary save */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                  {/* Style Stack detail items listing */}
                  <div className="bg-surface-container-low border-2 border-outline-variant p-4">
                    <h3 className="font-label-sm text-xs text-tertiary uppercase mb-4 border-b-2 border-dashed border-outline-variant pb-2 font-bold">
                      스타일 정보 (STYLE STACK COMPILATION)
                    </h3>
                    <ul className="space-y-3">
                      {/* Top */}
                      {resultOutfit.items.top && (
                        <li className="flex items-center gap-4 bg-surface p-2.5 border border-outline-variant hover:bg-surface-bright transition-colors">
                          <div className="w-12 h-12 bg-surface-container-highest border border-primary shrink-0 flex items-center justify-center p-1 overflow-hidden">
                            <img src={resultOutfit.items.top.imageUrl} alt={resultOutfit.items.top.name} className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-label-sm text-[10px] text-primary uppercase font-bold">Top [상의]</p>
                            <p className="font-body-md text-sm text-on-surface font-bold truncate">{resultOutfit.items.top.name}</p>
                          </div>
                          <ChevronRight size={16} className="text-outline-variant shrink-0" />
                        </li>
                      )}

                      {/* Bottom */}
                      {resultOutfit.items.bottom && (
                        <li className="flex items-center gap-4 bg-surface p-2.5 border border-outline-variant hover:bg-surface-bright transition-colors">
                          <div className="w-12 h-12 bg-surface-container-highest border border-primary shrink-0 flex items-center justify-center p-1 overflow-hidden">
                            <img src={resultOutfit.items.bottom.imageUrl} alt={resultOutfit.items.bottom.name} className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-label-sm text-[10px] text-primary uppercase font-bold">Bottom [하의]</p>
                            <p className="font-body-md text-sm text-on-surface font-bold truncate">{resultOutfit.items.bottom.name}</p>
                          </div>
                          <ChevronRight size={16} className="text-outline-variant shrink-0" />
                        </li>
                      )}

                      {/* Shoes */}
                      {resultOutfit.items.shoes && (
                        <li className="flex items-center gap-4 bg-surface p-2.5 border border-outline-variant hover:bg-surface-bright transition-colors">
                          <div className="w-12 h-12 bg-surface-container-highest border border-primary shrink-0 flex items-center justify-center p-1 overflow-hidden">
                            <img src={resultOutfit.items.shoes.imageUrl} alt={resultOutfit.items.shoes.name} className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-label-sm text-[10px] text-primary uppercase font-bold">Shoes [신발]</p>
                            <p className="font-body-md text-sm text-on-surface font-bold truncate">{resultOutfit.items.shoes.name}</p>
                          </div>
                          <ChevronRight size={16} className="text-outline-variant shrink-0" />
                        </li>
                      )}

                      {/* Accessories */}
                      {resultOutfit.items.accessories && (
                        <li className="flex items-center gap-4 bg-surface p-2.5 border border-outline-variant hover:bg-surface-bright transition-colors">
                          <div className="w-12 h-12 bg-surface-container-highest border border-primary shrink-0 flex items-center justify-center p-1 overflow-hidden">
                            <img src={resultOutfit.items.accessories.imageUrl} alt={resultOutfit.items.accessories.name} className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-label-sm text-[10px] text-primary uppercase font-bold">Accessories [소품]</p>
                            <p className="font-body-md text-sm text-on-surface font-bold truncate">{resultOutfit.items.accessories.name}</p>
                          </div>
                          <ChevronRight size={16} className="text-outline-variant shrink-0" />
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* AI Terminal Note */}
                  <div className="bg-[#100322] border-2 border-secondary-container p-4 font-label-sm text-xs text-secondary shadow-[inset_0_0_12px_rgba(0,238,252,0.15)] space-y-2">
                    <div className="flex items-center gap-2 text-outline-variant mb-1 font-bold">
                      <Terminal size={14} className="text-secondary" />
                      <span>AI 스타일리스트 노트.exe (TERMINAL)</span>
                    </div>
                    <div className="space-y-1.5 opacity-90 font-medium whitespace-pre-wrap leading-relaxed">
                      {resultOutfit.stylistNote}
                      <span className="cursor-blink"></span>
                    </div>
                  </div>

                  {/* Save action buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => setResultOutfit(null)}
                      className="flex-1 py-3 px-4 bg-surface text-secondary-container border-2 border-secondary-container font-headline-md text-sm uppercase font-bold flex items-center justify-center gap-1.5 hover:bg-secondary-container hover:text-on-secondary-container active:translate-x-[2px] active:translate-y-[2px] shadow-[4px_4px_0_0_#000] cursor-pointer"
                    >
                      <RefreshCw size={14} />
                      <span>다시 추천받기</span>
                    </button>

                    <button
                      onClick={handleSaveToDiary}
                      className="flex-1 py-3 px-4 bg-primary text-on-primary border-2 border-primary font-headline-md text-sm uppercase font-bold flex items-center justify-center gap-1.5 hover:brightness-110 active:translate-x-[2px] active:translate-y-[2px] shadow-[4px_4px_0_0_#000] cursor-pointer"
                    >
                      <Save size={14} />
                      <span>다이어리에 저장</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Saved styles panel */
        <div className="space-y-6">
          {savedStyles.length === 0 ? (
            <div className="bg-surface border-4 border-outline-variant p-12 text-center flex flex-col items-center justify-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-outline-variant">auto_awesome</span>
              <h3 className="font-headline-md text-xl text-primary uppercase font-bold">No Saved Coordinates Yet</h3>
              <p className="font-body-md text-sm text-on-surface-variant max-w-md">
                COORDINATION START 탭에서 날씨와 장소를 고르고 예쁜 추천 코디를 받아 다이어리에 저장해 보세요!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {savedStyles.map((outfit) => (
                <div
                  key={outfit.id}
                  className="bg-surface-container border-4 border-primary shadow-[4px_4px_0_0_#000] flex flex-col justify-between"
                >
                  {/* Outfit Info Header */}
                  <div className="bg-primary text-on-primary px-3 py-2 flex justify-between items-center border-b-2 border-primary">
                    <div className="font-label-sm text-xs uppercase flex items-center gap-1.5 font-bold">
                      <span className="material-symbols-outlined text-sm">favorite</span>
                      <span>SAVED_FIT_{outfit.savedAt.substring(11, 19).replace(/:/g, "")}.EXE</span>
                    </div>
                    <button
                      onClick={() => onDeleteOutfit(outfit.id)}
                      className="text-on-primary hover:text-error transition-colors"
                      title="Delete Saved Outfit"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Outfit layout cards */}
                  <div className="p-4 bg-surface bg-notebook space-y-4">
                    {/* Status badges */}
                    <div className="flex gap-2 font-label-sm text-[10px] uppercase font-bold">
                      <span className="bg-surface-container-high border border-primary px-2 py-0.5 text-primary">
                        🌤️ {outfit.weather}
                      </span>
                      <span className="bg-surface-container-high border border-secondary px-2 py-0.5 text-secondary">
                        📍 {outfit.destination}
                      </span>
                      <span className="bg-surface-container-high border border-tertiary px-2 py-0.5 text-tertiary">
                        🎭 {outfit.situation}
                      </span>
                    </div>

                    {/* Clothing pieces compiled */}
                    <div className="grid grid-cols-4 gap-2">
                      {outfit.items.top && (
                        <div className="bg-surface-container-low p-1.5 border border-outline-variant text-center" title={`Top: ${outfit.items.top.name}`}>
                          <div className="aspect-[1/1] bg-surface flex items-center justify-center p-0.5 border border-primary mb-1">
                            <img src={outfit.items.top.imageUrl} alt="Top" className="max-h-full max-w-full object-contain" />
                          </div>
                          <p className="font-label-sm text-[8px] text-primary uppercase font-bold truncate">TOP</p>
                        </div>
                      )}
                      {outfit.items.bottom && (
                        <div className="bg-surface-container-low p-1.5 border border-outline-variant text-center" title={`Bottom: ${outfit.items.bottom.name}`}>
                          <div className="aspect-[1/1] bg-surface flex items-center justify-center p-0.5 border border-primary mb-1">
                            <img src={outfit.items.bottom.imageUrl} alt="Bottom" className="max-h-full max-w-full object-contain" />
                          </div>
                          <p className="font-label-sm text-[8px] text-primary uppercase font-bold truncate">BOTTOM</p>
                        </div>
                      )}
                      {outfit.items.shoes && (
                        <div className="bg-surface-container-low p-1.5 border border-outline-variant text-center" title={`Shoes: ${outfit.items.shoes.name}`}>
                          <div className="aspect-[1/1] bg-surface flex items-center justify-center p-0.5 border border-primary mb-1">
                            <img src={outfit.items.shoes.imageUrl} alt="Shoes" className="max-h-full max-w-full object-contain" />
                          </div>
                          <p className="font-label-sm text-[8px] text-primary uppercase font-bold truncate">SHOES</p>
                        </div>
                      )}
                      {outfit.items.accessories ? (
                        <div className="bg-surface-container-low p-1.5 border border-outline-variant text-center" title={`Acc: ${outfit.items.accessories.name}`}>
                          <div className="aspect-[1/1] bg-surface flex items-center justify-center p-0.5 border border-primary mb-1">
                            <img src={outfit.items.accessories.imageUrl} alt="Acc" className="max-h-full max-w-full object-contain" />
                          </div>
                          <p className="font-label-sm text-[8px] text-primary uppercase font-bold truncate">ACC</p>
                        </div>
                      ) : (
                        <div className="bg-surface-container-low p-1.5 border border-outline-variant flex flex-col justify-center items-center opacity-30">
                          <div className="aspect-[1/1] w-full bg-surface border border-outline flex items-center justify-center font-label-sm text-[10px]">-</div>
                          <p className="font-label-sm text-[8px] text-on-surface-variant uppercase font-bold truncate">ACC</p>
                        </div>
                      )}
                    </div>

                    {/* Compact Stylist Note */}
                    <div className="bg-[#110424] p-3 font-label-sm text-[11px] text-secondary border border-outline-variant max-h-24 overflow-y-auto leading-relaxed">
                      {outfit.stylistNote.replace(/>/g, "").trim()}
                    </div>
                  </div>

                  {/* Saved Date */}
                  <div className="bg-surface-container-low p-2 border-t border-outline-variant flex justify-between items-center">
                    <span className="font-label-sm text-[10px] text-on-surface-variant">
                      SAVED: {new Date(outfit.savedAt).toLocaleDateString()}
                    </span>
                    <span className="font-label-sm text-[10px] text-secondary font-bold">
                      ACTIVE COORD
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
