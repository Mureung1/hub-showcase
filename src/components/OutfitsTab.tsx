import React, { useState } from "react";
import { ClothingItem, WeatherType, DestinationType, SituationType, SavedOutfit } from "../types";
import { Sun, Cloud, CloudRain, Snowflake, Coffee, GraduationCap, Briefcase, Sparkles, Home, Heart, Dumbbell, Gamepad2, RefreshCw, Save, ChevronRight, Terminal, Star, Trash2, ShoppingBag, Plus, Settings } from "lucide-react";
import DynamicPixelCharacter from "./DynamicPixelCharacter";

interface OutfitsTabProps {
  closet: ClothingItem[];
  savedStyles: SavedOutfit[];
  onSaveOutfit: (outfit: SavedOutfit) => void;
  onDeleteOutfit: (id: string) => void;
  onAddItem?: (item: ClothingItem) => void;
}

export default function OutfitsTab({ closet, savedStyles, onSaveOutfit, onDeleteOutfit, onAddItem }: OutfitsTabProps) {
  const [subTab, setSubTab] = useState<"recommend" | "saved">("recommend");

  // Selection states
  const [weather, setWeather] = useState<WeatherType>("sun");
  const [destination, setDestination] = useState<DestinationType>("cafe");
  const [situation, setSituation] = useState<SituationType>("casual");
  const [recommendMode, setRecommendMode] = useState<"my_closet" | "new_outfit">("my_closet");

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingLog, setLoadingLog] = useState<string[]>([]);

  // Track added items
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});

  // Recommendation outputs
  const [resultOutfit, setResultOutfit] = useState<SavedOutfit | null>(null);

  // Dynamic pixel character states
  const [pixelCharacter, setPixelCharacter] = useState<{
    bodyType: "bunny" | "kitty" | "bear" | "elf" | "human";
    hairColorName: string;
    accessoryType: "coffee" | "gamepad" | "umbrella" | "shades" | "dumbbells" | "none";
  } | null>(null);

  const generateRandomCharacter = () => {
    const bodies: ("bunny" | "kitty" | "bear" | "elf" | "human")[] = ["bunny", "kitty", "bear", "elf", "human"];

    // Select body based on situation/mood for more expressive aesthetic storytelling
    let selectedBody: "bunny" | "kitty" | "bear" | "elf" | "human" = "human";
    if (situation === "date") {
      selectedBody = Math.random() > 0.5 ? "bunny" : "kitty";
    } else if (situation === "workout") {
      selectedBody = Math.random() > 0.5 ? "bear" : "human";
    } else if (destination === "cafe") {
      selectedBody = Math.random() > 0.5 ? "kitty" : "human";
    } else if (situation === "formal") {
      selectedBody = Math.random() > 0.5 ? "elf" : "human";
    } else {
      selectedBody = bodies[Math.floor(Math.random() * bodies.length)];
    }

    // Select hair color based on situation/weather
    let hairColor = "cyan";
    const brightColors = ["pink", "yellow", "orange"];
    const coolColors = ["cyan", "violet", "green"];

    if (weather === "sun") {
      hairColor = brightColors[Math.floor(Math.random() * brightColors.length)];
    } else if (weather === "rain" || weather === "snow") {
      hairColor = coolColors[Math.floor(Math.random() * coolColors.length)];
    } else if (situation === "formal") {
      hairColor = Math.random() > 0.5 ? "grey" : "violet";
    } else {
      const allColors = ["pink", "violet", "green", "cyan", "yellow", "orange", "grey"];
      hairColor = allColors[Math.floor(Math.random() * allColors.length)];
    }

    // Choose accessory based on context
    let acc: "coffee" | "gamepad" | "umbrella" | "shades" | "dumbbells" | "none" = "none";
    if (weather === "rain") {
      acc = "umbrella";
    } else if (situation === "workout") {
      acc = "dumbbells";
    } else if (destination === "cafe") {
      acc = "coffee";
    } else if (weather === "sun") {
      acc = "shades";
    } else if (destination === "home" || situation === "casual") {
      acc = Math.random() > 0.5 ? "gamepad" : "none";
    } else {
      acc = "none";
    }

    setPixelCharacter({
      bodyType: selectedBody,
      hairColorName: hairColor,
      accessoryType: acc
    });
  };

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

  // Add item to closet
  const handleAddToCloset = (item: ClothingItem) => {
    if (onAddItem) {
      const newItem: ClothingItem = {
        id: "item-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        name: item.name,
        category: item.category,
        colors: item.colors,
        imageUrl: item.imageUrl,
        isCustom: true
      };
      onAddItem(newItem);
      setAddedItems(prev => ({ ...prev, [item.id]: true }));
    }
  };

  // Run Recommendation Request
  const handleRecommend = async (isRetry: boolean = false) => {
    if (isRetry) {
      setIsRecommending(true);
    } else {
      setIsLoading(true);
      setResultOutfit(null);
    }
    setLoadingStep(0);
    setAddedItems({});
    setLoadingLog(["> SYSTEM: Initiating outfit coordination sequence..."]);

    const steps = [
      { delay: 400, text: "> SYSTEM: Reading closet items database..." },
      { delay: 800, text: `> SYSTEM: Setting environmental parameters: weather=${weather}, location=${destination}` },
      { delay: 1200, text: `> SYSTEM: Parsing social coordinates: situation=${situation}` },
      { delay: 1600, text: `> SYSTEM: Accessing neural styling grid [MODE: ${recommendMode === "my_closet" ? "MY CLOSET" : "NEW OUTFIT"}]. Connecting to AI stylist core...` },
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
            closet,
            mode: recommendMode
          })
        });

        const data = await response.json();

        let recommendedOutfit: SavedOutfit;

        if (data.isNewOutfit) {
          recommendedOutfit = {
            id: "outfit-" + Date.now(),
            weather,
            destination,
            situation,
            items: {
              top: data.top,
              bottom: data.bottom,
              shoes: data.shoes,
              accessories: data.accessories
            },
            stylistNote: data.stylistNote || "> SYSTEM: New outfit compiled successfully.",
            savedAt: new Date().toISOString()
          };
        } else {
          // Map item IDs to actual clothing objects
          const topItem = closet.find(item => item.id === data.topId) || closet.find(item => item.category === 'top');
          const bottomItem = closet.find(item => item.id === data.bottomId) || closet.find(item => item.category === 'bottom');
          const shoesItem = closet.find(item => item.id === data.shoesId) || closet.find(item => item.category === 'shoes');
          const accessoriesItem = closet.find(item => item.id === data.accessoriesId) || closet.find(item => item.category === 'accessories');

          recommendedOutfit = {
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
        }

        generateRandomCharacter();
        setResultOutfit(recommendedOutfit);
        setLoadingStep(100);
      } catch (err) {
        console.error("AI Stylist Error:", err);
        setLoadingLog(prev => [...prev, "> ERROR: Stylist neural network failed. Returning dry recommendation..."]);
      } finally {
        setIsLoading(false);
        setIsRecommending(false);
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
          className={`px-6 py-3 font-headline-md text-sm uppercase tracking-wider transition-all border-t-4 border-x-4 ${subTab === "recommend"
            ? "bg-surface-container text-primary border-primary -mb-[4px] z-10 font-bold"
            : "bg-surface text-on-surface-variant border-transparent hover:text-on-surface"
            }`}
        >
          COORDINATION START (코디 추천)
        </button>
        <button
          onClick={() => setSubTab("saved")}
          className={`px-6 py-3 font-headline-md text-sm uppercase tracking-wider transition-all border-t-4 border-x-4 ${subTab === "saved"
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
                      <h3 className="font-headline-md text-lg text-primary mb-5 flex items-center justify-between font-bold">
                        <span className="flex items-center space-x-2">
                          <span className="material-symbols-outlined">partly_cloudy_day</span>
                          <span>WEATHER [날씨]</span>
                        </span>
                        {weather && (
                          <span className="font-label-sm text-xs bg-primary/20 text-primary px-2 py-0.5 border border-primary/30 truncate max-w-[200px]">
                            {weather}
                          </span>
                        )}
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(["sun", "cloud", "rain", "snow"] as const).map((w) => (
                          <div key={w} className="relative">
                            <button
                              type="button"
                              onClick={() => setWeather(w)}
                              className={`w-full text-center border-2 p-4 cursor-pointer transition-all font-label-sm uppercase font-bold flex flex-col items-center justify-center gap-2 ${weather === w
                                ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed shadow-none translate-x-[2px] translate-y-[2px]"
                                : "bg-surface text-primary border-primary shadow-[4px_4px_0_0_#bd00ff] hover:bg-surface-variant"
                                }`}
                            >
                              {weatherIcons[w as WeatherType]}
                              <span className="text-xs">{w}</span>
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Custom Weather Typing */}
                      <div className="mt-4 pt-4 border-t border-dashed border-outline-variant">
                        <label className="block font-label-sm text-xs text-on-surface-variant uppercase mb-2 font-bold">
                          ✍️ 날씨 직접 입력 (CUSTOM WEATHER)
                        </label>
                        <input
                          type="text"
                          value={weather}
                          onChange={(e) => setWeather(e.target.value)}
                          placeholder="예: 화창한 봄날, 땀나는 한여름, 칼바람 부는 겨울, 장마철..."
                          className="w-full bg-surface-container-lowest border-2 border-primary text-on-surface px-4 py-2.5 text-sm font-bold shadow-[2px_2px_0_0_#000] focus:outline-none focus:border-secondary transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Destination Selection */}
                  <div className="relative">
                    <div className="absolute -left-3 -top-5 text-secondary opacity-30 font-headline-lg text-5xl select-none font-bold">02</div>
                    <div className="border-2 border-outline-variant bg-surface-container p-6 relative z-10 shadow-[4px_4px_0_0_#3e2c5a]">
                      <h3 className="font-headline-md text-lg text-secondary mb-5 flex items-center justify-between font-bold">
                        <span className="flex items-center space-x-2">
                          <span className="material-symbols-outlined">map</span>
                          <span>DESTINATION [장소]</span>
                        </span>
                        {destination && (
                          <span className="font-label-sm text-xs bg-secondary/20 text-secondary px-2 py-0.5 border border-secondary/30 truncate max-w-[200px]">
                            {destination}
                          </span>
                        )}
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {(["cafe", "school", "office", "party", "home"] as const).map((d) => (
                          <div key={d} className="relative col-span-1">
                            <button
                              type="button"
                              onClick={() => setDestination(d)}
                              className={`w-full text-center border-2 p-3.5 cursor-pointer transition-all font-label-sm uppercase font-bold flex flex-col items-center justify-center gap-1.5 ${destination === d
                                ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed shadow-none translate-x-[2px] translate-y-[2px]"
                                : "bg-surface text-secondary border-secondary shadow-[4px_4px_0_0_#00eefc] hover:bg-surface-variant"
                                }`}
                            >
                              {destIcons[d as DestinationType]}
                              <span className="text-xs">{d}</span>
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Custom Destination Typing */}
                      <div className="mt-4 pt-4 border-t border-dashed border-outline-variant">
                        <label className="block font-label-sm text-xs text-on-surface-variant uppercase mb-2 font-bold">
                          ✍️ 장소 직접 입력 (CUSTOM DESTINATION)
                        </label>
                        <input
                          type="text"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          placeholder="예: 강남역 번화가, 한강공원 피크닉, 바닷가, 독서실..."
                          className="w-full bg-surface-container-lowest border-2 border-secondary text-on-surface px-4 py-2.5 text-sm font-bold shadow-[2px_2px_0_0_#000] focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Situation Selection */}
                  <div className="relative">
                    <div className="absolute -left-3 -top-5 text-tertiary opacity-30 font-headline-lg text-5xl select-none font-bold">03</div>
                    <div className="border-2 border-outline-variant bg-surface-container p-6 relative z-10 shadow-[4px_4px_0_0_#3e2c5a]">
                      <h3 className="font-headline-md text-lg text-tertiary mb-5 flex items-center justify-between font-bold">
                        <span className="flex items-center space-x-2">
                          <span className="material-symbols-outlined">theater_comedy</span>
                          <span>SITUATION [상황]</span>
                        </span>
                        {situation && (
                          <span className="font-label-sm text-xs bg-tertiary/20 text-tertiary px-2 py-0.5 border border-tertiary/30 truncate max-w-[200px]">
                            {situation}
                          </span>
                        )}
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(["date", "workout", "casual", "formal"] as const).map((s) => (
                          <div key={s} className="relative">
                            <button
                              type="button"
                              onClick={() => setSituation(s)}
                              className={`w-full text-center border-2 p-3.5 cursor-pointer transition-all font-label-sm uppercase font-bold flex flex-col items-center justify-center gap-1.5 ${situation === s
                                ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed shadow-none translate-x-[2px] translate-y-[2px]"
                                : "bg-surface text-tertiary border-tertiary shadow-[4px_4px_0_0_#8f64ad] hover:bg-surface-variant"
                                }`}
                            >
                              {sitIcons[s as SituationType]}
                              <span className="text-xs">{s}</span>
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Custom Situation Typing */}
                      <div className="mt-4 pt-4 border-t border-dashed border-outline-variant">
                        <label className="block font-label-sm text-xs text-on-surface-variant uppercase mb-2 font-bold">
                          ✍️ 상황 직접 입력 (CUSTOM SITUATION)
                        </label>
                        <input
                          type="text"
                          value={situation}
                          onChange={(e) => setSituation(e.target.value)}
                          placeholder="예: 첫 데이트, 편안한 동네 산책, 졸업 사진 촬영, 면접..."
                          className="w-full bg-surface-container-lowest border-2 border-tertiary text-on-surface px-4 py-2.5 text-sm font-bold shadow-[2px_2px_0_0_#000] focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recommend Mode Selection */}
                  <div className="relative animate-fade-in">
                    <div className="absolute -left-3 -top-5 text-[#00ffcc] opacity-30 font-headline-lg text-5xl select-none font-bold">04</div>
                    <div className="border-2 border-outline-variant bg-surface-container p-6 relative z-10 shadow-[4px_4px_0_0_#3e2c5a]">
                      <h3 className="font-headline-md text-lg text-[#00ffcc] mb-5 flex items-center justify-between font-bold">
                        <span className="flex items-center space-x-2">
                          <span className="material-symbols-outlined text-[#00ffcc]">psychology</span>
                          <span>RECOMMEND MODE [추천 방식 설정]</span>
                        </span>
                        <span className="font-label-sm text-xs bg-[#00ffcc]/20 text-[#00ffcc] px-2 py-0.5 border border-[#00ffcc]/30">
                          {recommendMode === "my_closet" ? "소장용 스타일링" : "새로운 코디 추천 (+쇼핑)"}
                        </span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setRecommendMode("my_closet")}
                          className={`w-full text-center border-2 p-4 cursor-pointer transition-all font-label-sm uppercase font-bold flex flex-col items-center justify-center gap-1 ${recommendMode === "my_closet"
                            ? "bg-primary text-on-primary border-primary shadow-none translate-x-[2px] translate-y-[2px]"
                            : "bg-surface text-primary border-primary shadow-[4px_4px_0_0_#bd00ff] hover:bg-surface-variant"
                            }`}
                        >
                          <span className="text-sm">내 옷장 코디 [MY CLOSET]</span>
                          <span className="text-[10px] opacity-80">내가 등록한 내 옷장 의류들로만 코디</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRecommendMode("new_outfit")}
                          className={`w-full text-center border-2 p-4 cursor-pointer transition-all font-label-sm uppercase font-bold flex flex-col items-center justify-center gap-1 ${recommendMode === "new_outfit"
                            ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed shadow-none translate-x-[2px] translate-y-[2px]"
                            : "bg-surface text-secondary border-secondary shadow-[4px_4px_0_0_#00eefc] hover:bg-surface-variant"
                            }`}
                        >
                          <span className="text-sm flex items-center gap-1">✨ 새로운 코디 [NEW STYLE]</span>
                          <span className="text-[10px] opacity-80">인공지능(Gemini) 추천 신상 의류 + 쇼핑몰 링크</span>
                        </button>
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
                    <div className="absolute inset-0 flex items-center justify-center p-4 bg-notebook">
                      {isRecommending ? (
                        <div className="text-center flex flex-col items-center gap-4 animate-pulse">
                          <RefreshCw size={40} className="text-secondary animate-spin" />
                          <div className="font-mono text-xs text-secondary tracking-widest font-bold">
                            RE-ALIGNING STYLE VECTOR...
                          </div>
                          <div className="font-mono text-[10px] text-on-surface-variant max-w-[200px] text-center">
                            {loadingLog[loadingLog.length - 1] || "> Sourcing new aesthetics..."}
                          </div>
                        </div>
                      ) : pixelCharacter ? (
                        <DynamicPixelCharacter
                          bodyType={pixelCharacter.bodyType}
                          topColorName={resultOutfit.items.top?.colors}
                          bottomColorName={resultOutfit.items.bottom?.colors}
                          shoesColorName={resultOutfit.items.shoes?.colors}
                          accessoryType={pixelCharacter.accessoryType}
                          hairColorName={pixelCharacter.hairColorName}
                          size={240}
                        />
                      ) : (
                        <div className="text-center font-mono text-xs text-outline">Loading styling matrix...</div>
                      )}
                    </div>

                    {/* Floating stickers animations overlay */}
                    <div className="absolute top-4 left-4 p-2 bg-surface-container-highest border-2 border-secondary rotate-[-10deg] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-20 animate-bounce">
                      <span className="font-label-sm text-secondary text-sm font-bold flex items-center gap-1">💖 PMC</span>
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

                  {/* Re-recommend & Reset buttons container */}
                  <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full">
                    <button
                      onClick={() => handleRecommend(true)}
                      disabled={isRecommending}
                      className="flex-1 px-4 py-2.5 bg-secondary text-on-secondary-fixed hover:bg-opacity-95 transition-all font-headline-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_#000] cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={isRecommending ? "animate-spin" : ""} />
                      <span>{isRecommending ? "추천받는 중..." : "AI 추천 다시 받기 ✨"}</span>
                    </button>
                    <button
                      onClick={() => setResultOutfit(null)}
                      disabled={isRecommending}
                      className="px-4 py-2.5 bg-surface border-2 border-outline text-on-surface hover:bg-surface-variant transition-all font-headline-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_#000] cursor-pointer disabled:opacity-50"
                    >
                      <span>다시 설정하기 (SETUP) ⚙️</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Style stack info, note, diary save */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                  {/* Style Stack detail items listing */}
                  <div className="bg-surface-container-low border-2 border-outline-variant p-4">
                    <h3 className="font-label-sm text-xs text-tertiary uppercase mb-4 border-b-2 border-dashed border-outline-variant pb-2 font-bold">
                      스타일 정보 (STYLE STACK COMPILATION)
                    </h3>
                    <ul className="space-y-4">
                      {/* Top */}
                      {resultOutfit.items.top && (
                        <li className="flex flex-col md:flex-row md:items-center gap-4 bg-surface p-3 border border-outline-variant hover:bg-surface-bright transition-colors relative">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-16 h-16 bg-surface-container-highest border border-primary shrink-0 flex items-center justify-center p-1 overflow-hidden">
                              <img src={resultOutfit.items.top.imageUrl} alt={resultOutfit.items.top.name} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-label-sm text-[10px] text-primary uppercase font-bold">Top [상의]</p>
                                {resultOutfit.items.top.shoppingUrl && (
                                  <span className="px-1.5 py-0.5 bg-secondary/20 text-secondary border border-secondary/30 text-[8px] uppercase font-bold">NEW 🆕</span>
                                )}
                              </div>
                              <p className="font-body-md text-sm text-on-surface font-bold truncate">{resultOutfit.items.top.name}</p>
                              {resultOutfit.items.top.description && (
                                <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">{resultOutfit.items.top.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Shopping & Add to closet actions */}
                          {resultOutfit.items.top.shoppingUrl && (
                            <div className="flex gap-2 shrink-0 md:self-center">
                              <a
                                href={resultOutfit.items.top.shoppingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-secondary text-on-secondary-fixed text-xs font-bold border border-secondary shadow-[2px_2px_0_0_#000] flex items-center gap-1 hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                              >
                                <ShoppingBag size={12} />
                                <span>쇼핑몰 가기 🛒</span>
                              </a>
                              {onAddItem && (
                                <button
                                  onClick={() => handleAddToCloset(resultOutfit!.items.top!)}
                                  disabled={!!addedItems[resultOutfit.items.top.id]}
                                  className={`px-3 py-1.5 text-xs font-bold border flex items-center gap-1 transition-all ${addedItems[resultOutfit.items.top.id]
                                    ? "bg-neutral-800 text-neutral-400 border-neutral-700 cursor-not-allowed"
                                    : "bg-surface text-primary border-primary shadow-[2px_2px_0_0_#000] hover:bg-surface-variant active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
                                    }`}
                                >
                                  <Plus size={12} />
                                  <span>{addedItems[resultOutfit.items.top.id] ? "추가 완료 ✅" : "내 옷장에 추가"}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      )}

                      {/* Bottom */}
                      {resultOutfit.items.bottom && (
                        <li className="flex flex-col md:flex-row md:items-center gap-4 bg-surface p-3 border border-outline-variant hover:bg-surface-bright transition-colors relative">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-16 h-16 bg-surface-container-highest border border-primary shrink-0 flex items-center justify-center p-1 overflow-hidden">
                              <img src={resultOutfit.items.bottom.imageUrl} alt={resultOutfit.items.bottom.name} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-label-sm text-[10px] text-primary uppercase font-bold">Bottom [하의]</p>
                                {resultOutfit.items.bottom.shoppingUrl && (
                                  <span className="px-1.5 py-0.5 bg-secondary/20 text-secondary border border-secondary/30 text-[8px] uppercase font-bold">NEW 🆕</span>
                                )}
                              </div>
                              <p className="font-body-md text-sm text-on-surface font-bold truncate">{resultOutfit.items.bottom.name}</p>
                              {resultOutfit.items.bottom.description && (
                                <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">{resultOutfit.items.bottom.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Shopping & Add to closet actions */}
                          {resultOutfit.items.bottom.shoppingUrl && (
                            <div className="flex gap-2 shrink-0 md:self-center">
                              <a
                                href={resultOutfit.items.bottom.shoppingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-secondary text-on-secondary-fixed text-xs font-bold border border-secondary shadow-[2px_2px_0_0_#000] flex items-center gap-1 hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                              >
                                <ShoppingBag size={12} />
                                <span>쇼핑몰 가기 🛒</span>
                              </a>
                              {onAddItem && (
                                <button
                                  onClick={() => handleAddToCloset(resultOutfit!.items.bottom!)}
                                  disabled={!!addedItems[resultOutfit.items.bottom.id]}
                                  className={`px-3 py-1.5 text-xs font-bold border flex items-center gap-1 transition-all ${addedItems[resultOutfit.items.bottom.id]
                                    ? "bg-neutral-800 text-neutral-400 border-neutral-700 cursor-not-allowed"
                                    : "bg-surface text-primary border-primary shadow-[2px_2px_0_0_#000] hover:bg-surface-variant active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
                                    }`}
                                >
                                  <Plus size={12} />
                                  <span>{addedItems[resultOutfit.items.bottom.id] ? "추가 완료 ✅" : "내 옷장에 추가"}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      )}

                      {/* Shoes */}
                      {resultOutfit.items.shoes && (
                        <li className="flex flex-col md:flex-row md:items-center gap-4 bg-surface p-3 border border-outline-variant hover:bg-surface-bright transition-colors relative">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-16 h-16 bg-surface-container-highest border border-primary shrink-0 flex items-center justify-center p-1 overflow-hidden">
                              <img src={resultOutfit.items.shoes.imageUrl} alt={resultOutfit.items.shoes.name} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-label-sm text-[10px] text-primary uppercase font-bold">Shoes [신발]</p>
                                {resultOutfit.items.shoes.shoppingUrl && (
                                  <span className="px-1.5 py-0.5 bg-secondary/20 text-secondary border border-secondary/30 text-[8px] uppercase font-bold">NEW 🆕</span>
                                )}
                              </div>
                              <p className="font-body-md text-sm text-on-surface font-bold truncate">{resultOutfit.items.shoes.name}</p>
                              {resultOutfit.items.shoes.description && (
                                <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">{resultOutfit.items.shoes.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Shopping & Add to closet actions */}
                          {resultOutfit.items.shoes.shoppingUrl && (
                            <div className="flex gap-2 shrink-0 md:self-center">
                              <a
                                href={resultOutfit.items.shoes.shoppingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-secondary text-on-secondary-fixed text-xs font-bold border border-secondary shadow-[2px_2px_0_0_#000] flex items-center gap-1 hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                              >
                                <ShoppingBag size={12} />
                                <span>쇼핑몰 가기 🛒</span>
                              </a>
                              {onAddItem && (
                                <button
                                  onClick={() => handleAddToCloset(resultOutfit!.items.shoes!)}
                                  disabled={!!addedItems[resultOutfit.items.shoes.id]}
                                  className={`px-3 py-1.5 text-xs font-bold border flex items-center gap-1 transition-all ${addedItems[resultOutfit.items.shoes.id]
                                    ? "bg-neutral-800 text-neutral-400 border-neutral-700 cursor-not-allowed"
                                    : "bg-surface text-primary border-primary shadow-[2px_2px_0_0_#000] hover:bg-surface-variant active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
                                    }`}
                                >
                                  <Plus size={12} />
                                  <span>{addedItems[resultOutfit.items.shoes.id] ? "추가 완료 ✅" : "내 옷장에 추가"}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      )}

                      {/* Accessories */}
                      {resultOutfit.items.accessories && (
                        <li className="flex flex-col md:flex-row md:items-center gap-4 bg-surface p-3 border border-outline-variant hover:bg-surface-bright transition-colors relative">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-16 h-16 bg-surface-container-highest border border-primary shrink-0 flex items-center justify-center p-1 overflow-hidden">
                              <img src={resultOutfit.items.accessories.imageUrl} alt={resultOutfit.items.accessories.name} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-label-sm text-[10px] text-primary uppercase font-bold">Accessories [소품]</p>
                                {resultOutfit.items.accessories.shoppingUrl && (
                                  <span className="px-1.5 py-0.5 bg-secondary/20 text-secondary border border-secondary/30 text-[8px] uppercase font-bold">NEW 🆕</span>
                                )}
                              </div>
                              <p className="font-body-md text-sm text-on-surface font-bold truncate">{resultOutfit.items.accessories.name}</p>
                              {resultOutfit.items.accessories.description && (
                                <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">{resultOutfit.items.accessories.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Shopping & Add to closet actions */}
                          {resultOutfit.items.accessories.shoppingUrl && (
                            <div className="flex gap-2 shrink-0 md:self-center">
                              <a
                                href={resultOutfit.items.accessories.shoppingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-secondary text-on-secondary-fixed text-xs font-bold border border-secondary shadow-[2px_2px_0_0_#000] flex items-center gap-1 hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                              >
                                <ShoppingBag size={12} />
                                <span>쇼핑몰 가기 🛒</span>
                              </a>
                              {onAddItem && (
                                <button
                                  onClick={() => handleAddToCloset(resultOutfit!.items.accessories!)}
                                  disabled={!!addedItems[resultOutfit.items.accessories.id]}
                                  className={`px-3 py-1.5 text-xs font-bold border flex items-center gap-1 transition-all ${addedItems[resultOutfit.items.accessories.id]
                                    ? "bg-neutral-800 text-neutral-400 border-neutral-700 cursor-not-allowed"
                                    : "bg-surface text-primary border-primary shadow-[2px_2px_0_0_#000] hover:bg-surface-variant active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
                                    }`}
                                >
                                  <Plus size={12} />
                                  <span>{addedItems[resultOutfit.items.accessories.id] ? "추가 완료 ✅" : "내 옷장에 추가"}</span>
                                </button>
                              )}
                            </div>
                          )}
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
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => handleRecommend(true)}
                      disabled={isRecommending}
                      className="flex-1 py-3 px-4 bg-surface text-secondary border-2 border-secondary font-headline-md text-sm uppercase font-bold flex items-center justify-center gap-1.5 hover:bg-secondary/10 disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] shadow-[4px_4px_0_0_#000] cursor-pointer"
                    >
                      <RefreshCw size={14} className={isRecommending ? "animate-spin" : ""} />
                      <span>{isRecommending ? "추천받는 중..." : "AI 추천 다시 받기 ✨"}</span>
                    </button>

                    <button
                      onClick={() => setResultOutfit(null)}
                      disabled={isRecommending}
                      className="flex-1 py-3 px-4 bg-surface text-on-surface border-2 border-outline font-headline-md text-sm uppercase font-bold flex items-center justify-center gap-1.5 hover:bg-surface-variant disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] shadow-[4px_4px_0_0_#000] cursor-pointer"
                    >
                      <Settings size={14} />
                      <span>다시 설정하기 ⚙️</span>
                    </button>

                    <button
                      onClick={handleSaveToDiary}
                      disabled={isRecommending}
                      className="flex-1 py-3 px-4 bg-primary text-on-primary border-2 border-primary font-headline-md text-sm uppercase font-bold flex items-center justify-center gap-1.5 hover:brightness-110 disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] shadow-[4px_4px_0_0_#000] cursor-pointer"
                    >
                      <Save size={14} />
                      <span>다이어리에 저장 💖</span>
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
