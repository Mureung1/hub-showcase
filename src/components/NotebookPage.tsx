import React, { useState } from 'react';
import { 
  Sparkles, Pin, Heart, ShoppingBag, Loader2, Plus, Camera, 
  CloudSun, MapPin, Smile, ArrowRight, ChevronLeft, Calendar 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ClothesItem } from '../types';

interface NotebookPageProps {
  clothes: ClothesItem[];
  currentOutfit: { top?: ClothesItem; companion?: ClothesItem };
  diaryNote: { title: string; text: string; source?: string };
  onRecommend: (mood: string, weather: string, place: string, situation: string) => void;
  onUploadClick: () => void;
  onSaveOutfit: () => void;
  isRecommendLoading: boolean;
}

const WEATHER_OPTIONS = [
  { id: 'sunny', label: '맑음 ☀️', text: '맑은 날' },
  { id: 'cloudy', label: '흐림 ☁️', text: '흐린 날' },
  { id: 'rainy', label: '비 ☔', text: '비 오는 날' },
  { id: 'snowy', label: '눈 ❄️', text: '눈 오는 날' },
  { id: 'windy', label: '바람 🍃', text: '바람부는 날' },
];

const PLACE_OPTIONS = [
  { id: 'cafe', label: '카페 ☕', text: '감성 카페' },
  { id: 'park', label: '공원 🏞️', text: '한강 공원' },
  { id: 'city', label: '도심 🏙️', text: '핫플레이스/도심' },
  { id: 'office', label: '일터/학교 🏫', text: '학교/사무실' },
  { id: 'home', label: '집 🏠', text: '편안한 집' },
];

const SITUATION_OPTIONS = [
  { id: 'date', label: '데이트 🎀', text: '특별한 데이트', moodLabel: '러블리 데이트 🎀' },
  { id: 'daily', label: '일상/산책 🍃', text: '일상/가벼운 산책', moodLabel: '편안한 일상 🍃' },
  { id: 'meeting', label: '미팅 ✨', text: '단정한 면접/미팅', moodLabel: '단정한 면접/미팅 ✨' },
  { id: 'dinner', label: '저녁 약속 🍽️', text: '맛있는 저녁 약속', moodLabel: '로맨틱 디너 ✨' },
  { id: 'photo', label: '인생샷 📷', text: '소중한 인생샷 남기기', moodLabel: '프렌치 시크 🕶️' },
];

export default function NotebookPage({
  clothes,
  currentOutfit,
  diaryNote,
  onRecommend,
  onUploadClick,
  onSaveOutfit,
  isRecommendLoading,
}: NotebookPageProps) {
  const [stage, setStage] = useState<'welcome' | 'selection' | 'result'>('welcome');
  const [selectedWeather, setSelectedWeather] = useState('sunny');
  const [selectedPlace, setSelectedPlace] = useState('cafe');
  const [selectedSituation, setSelectedSituation] = useState('date');
  const [isSaved, setIsSaved] = useState(false);

  const handleStartFlow = () => {
    setStage('selection');
  };

  const handleCompleteSelection = () => {
    setIsSaved(false);
    
    const weatherText = WEATHER_OPTIONS.find(o => o.id === selectedWeather)?.text || '맑은 날';
    const placeText = PLACE_OPTIONS.find(o => o.id === selectedPlace)?.text || '감성 카페';
    const situationObj = SITUATION_OPTIONS.find(o => o.id === selectedSituation);
    const situationText = situationObj?.text || '일상/가벼운 산책';
    const moodLabel = situationObj?.moodLabel || '오늘의 특별한 기분';

    onRecommend(moodLabel, weatherText, placeText, situationText);
    setStage('result');
  };

  const handleSaveClick = () => {
    onSaveOutfit();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="w-full max-w-[900px] mx-auto mt-6 md:mt-16 px-4 pb-16 relative">
      
      {/* Top Header Navigation matching the image */}
      <header className="bg-white border-t-4 border-secondary shadow-xs rounded-b-2xl h-14 flex justify-between items-center px-6 max-w-[900px] mx-auto mb-10 border-b border-pink-100">
        <div className="flex items-center gap-2 select-none">
          <span className="font-sans font-extrabold text-secondary tracking-wider text-md">Pick My Clothes</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-secondary hover:scale-110 active:scale-95 transition-all">
            <Heart className="w-5 h-5 fill-secondary/10" />
          </button>
          <button className="text-secondary hover:scale-110 active:scale-95 transition-all">
            <ShoppingBag className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Metal Spiral Binder Rings Visual - Floating above the page */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-[840px] z-30 flex justify-around px-8 pointer-events-none select-none">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="w-3.5 h-9 spiral-ring rounded-full shadow-inner border border-stone-400"></div>
        ))}
      </div>

      {/* Main Notebook Sheet */}
      <main className="mt-4 bg-white notebook-page min-h-[1000px] relative p-6 md:p-14 rounded-3xl border border-stone-200/50 overflow-hidden">
        
        {/* Decorative Doodles and Stickers */}
        <div className="absolute top-16 right-8 rotate-12 opacity-90 select-none pointer-events-none">
          <Sparkles className="w-10 h-10 text-secondary-container fill-secondary/20" />
        </div>


        {/* Transitioning Stages inside Notebook Sheet */}
        <AnimatePresence mode="wait">
          {stage === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="ml-10 md:ml-16 mt-8 space-y-8"
            >
              <div>
                <h1 className="font-serif text-4xl md:text-5xl font-black text-on-background tracking-tight mb-2 select-none">
                  Pick My Clothes
                </h1>
                <p className="font-serif text-base text-stone-500 italic">
                  오늘의 기분을 입어보세요. 나만의 디지털 스타일 다이어리.
                </p>
              </div>

              {/* Scrapbook Intro Card */}
              <div className="bg-secondary-container/10 p-6 md:p-8 rounded-2xl border-2 border-dashed border-secondary/20 relative">
                <Pin className="w-6 h-6 absolute -top-3 right-6 text-secondary fill-secondary/80 transform rotate-12" />
                
                <h3 className="font-serif text-xl font-bold text-secondary mb-3 flex items-center gap-2">
                  ✨ 스마트 인공지능 코디 다이어리
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed font-medium">
                  나만의 디지털 옷장에 옷들을 업로드해 보세요! 오늘의 날씨, 방문할 장소, 마주할 상황을 
                  선택하면 구글의 최첨단 인공지능 <strong>Gemini</strong>와 스마트 코디네이터가 옷장 아이템 중 
                  찰떡 조합을 골라 감성 가득한 스타일 코평과 다이어리를 선물해 드립니다.
                </p>
              </div>

              {/* Buttons with Washi-tape aesthetic */}
              <div className="flex flex-wrap gap-4 pt-4">
                <button
                  onClick={handleStartFlow}
                  className="bg-secondary-container text-on-secondary-container font-sans font-bold text-sm px-8 py-4 rounded-none rotate-1 shadow-sm hover:rotate-0 transition-transform active:scale-95 washi-tape flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-secondary fill-secondary/20" />
                  코디 추천 시작 🎀
                </button>
                <button
                  onClick={onUploadClick}
                  className="border-2 border-stone-300 text-stone-700 font-sans font-bold text-sm px-8 py-4 rounded-none -rotate-1 hover:rotate-0 hover:bg-stone-50 transition-transform active:scale-95 bg-white/50 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  나의 옷장 업로드
                </button>
              </div>

              {/* Recent outfit snapshot display to avoid empty spaces */}
              {currentOutfit.top && (
                <div className="pt-8 border-t border-stone-100">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">최근 추천되었던 스타일 스냅샷</h4>
                  <div className="flex items-center gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200/50 max-w-md">
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-stone-200">
                      <img src={currentOutfit.top.image} alt="top" className="w-full h-full object-cover" />
                    </div>
                    {currentOutfit.companion && (
                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-stone-200">
                        <img src={currentOutfit.companion.image} alt="companion" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-xs font-bold text-stone-600 truncate">{diaryNote.title}</p>
                      <p className="text-[10px] text-stone-400 truncate mt-0.5">{diaryNote.text}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {stage === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="ml-10 md:ml-16 mt-8 space-y-10"
            >
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setStage('welcome')}
                  className="p-1.5 hover:bg-stone-100 text-stone-500 hover:text-stone-800 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl font-black text-on-background tracking-tight">
                    오늘의 라이프 무드 기록하기
                  </h2>
                  <p className="text-xs text-stone-400 font-medium mt-1">오늘 입을 옷의 맥락을 위해 날씨, 장소, 상황을 선택해주세요.</p>
                </div>
              </div>

              <div className="space-y-8 bg-stone-50/50 p-6 rounded-2xl border border-stone-200/50">
                
                {/* 1. WEATHER SELECTOR */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <CloudSun className="w-4 h-4 text-secondary" />
                    1. 오늘의 날씨는 어떤가요?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {WEATHER_OPTIONS.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedWeather(option.id)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                          selectedWeather === option.id
                            ? 'bg-secondary text-white border-secondary shadow-xs scale-102 font-bold'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-secondary-container'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. PLACE SELECTOR */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-secondary" />
                    2. 어디를 방문할 예정인가요?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {PLACE_OPTIONS.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedPlace(option.id)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                          selectedPlace === option.id
                            ? 'bg-secondary text-white border-secondary shadow-xs scale-102 font-bold'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-secondary-container'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. SITUATION SELECTOR */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-secondary" />
                    3. 어떤 상황/만남이 있나요?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {SITUATION_OPTIONS.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedSituation(option.id)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                          selectedSituation === option.id
                            ? 'bg-secondary text-white border-secondary shadow-xs scale-102 font-bold'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-secondary-container'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Selection complete action controls */}
              <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                <button
                  onClick={() => setStage('welcome')}
                  className="px-5 py-2.5 border border-stone-200 text-stone-500 rounded-xl hover:bg-stone-50 hover:text-stone-800 transition-colors text-xs font-bold"
                >
                  이전으로
                </button>

                <button
                  onClick={handleCompleteSelection}
                  className="px-6 py-3 bg-secondary text-white rounded-xl hover:opacity-95 active:scale-95 transition-all text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  선택 완료 및 추천받기
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {stage === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="ml-10 md:ml-16 mt-8 space-y-10"
            >
              
              {/* Header result row */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl font-black text-on-background tracking-tight">
                    오늘의 추천 코디 조각 ✨
                  </h2>
                  <p className="text-xs text-stone-400 font-medium mt-1">
                    선택하신 <span className="text-secondary font-bold">
                      {WEATHER_OPTIONS.find(o => o.id === selectedWeather)?.label.split(' ')[0]} / {PLACE_OPTIONS.find(o => o.id === selectedPlace)?.label.split(' ')[0]} / {SITUATION_OPTIONS.find(o => o.id === selectedSituation)?.label.split(' ')[0]}
                    </span>에 맞춰 코디를 추천해 드립니다!
                  </p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setStage('selection')}
                    className="p-2 border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-500 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="다시 선택하기"
                  >
                    다시 선택 🔄
                  </button>
                </div>
              </div>

              {/* Recommendation Loader Overlay if active */}
              {isRecommendLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[350px] p-8 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
                  <Loader2 className="w-12 h-12 text-secondary animate-spin mb-4" />
                  <p className="font-serif text-base font-bold text-stone-600">당신의 소중한 옷장을 불러오는 중...</p>
                  <p className="text-xs text-stone-400 mt-1">구글 Gemini 인공지능이 오늘 날씨와 장소에 찰떡인 스타일을 완성하고 있습니다 🎨💖</p>
                </div>
              ) : (
                <>
                  {/* Polaroid Card Grid WITH PHOTOS (Mandatory constraint satisfied) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 items-start">
                    
                    {/* Polaroid Card 1 (Top / Main Outfit item) */}
                    {currentOutfit.top ? (
                      <div className="bg-white p-4 polaroid rotate-2 transition-transform hover:-rotate-1 duration-300 w-fit mx-auto sm:mx-0 border border-stone-200/40 relative">
                        <div className="relative">
                          {/* Visual Washi-tape holding the polaroid */}
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-20 h-7 washi-tape opacity-85 z-10 shadow-xs"></div>
                          <div className="w-56 h-56 overflow-hidden bg-stone-50 border border-stone-100">
                            <img
                              alt={currentOutfit.top.name}
                              className="w-full h-full object-cover"
                              src={currentOutfit.top.image}
                            />
                          </div>
                        </div>
                        <p className="handwritten text-on-background text-center text-lg font-bold mt-4">
                          {currentOutfit.top.name}
                        </p>
                        <p className="text-[11px] text-stone-400 font-sans text-center mt-1">
                          {currentOutfit.top.tag || 'Classic Piece'}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-stone-50/50 border-2 border-dashed border-stone-200 p-8 rounded-2xl flex flex-col items-center justify-center min-h-[250px] w-56 mx-auto sm:mx-0">
                        <p className="text-xs text-stone-400 text-center font-serif italic">상의 옷장이 비어있어요.<br/>나의 옷장에 옷을 먼저 등록해보세요!</p>
                      </div>
                    )}

                    {/* Polaroid Card 2 (Companion Outer/Bottom item) */}
                    {currentOutfit.companion ? (
                      <div className="bg-white p-4 polaroid -rotate-3 transition-transform hover:rotate-1 duration-300 w-fit mx-auto sm:mx-0 sm:mt-16 border border-stone-200/40 relative">
                        <div className="relative">
                          {/* Contrast colored washi tape */}
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-20 h-7 bg-pink-100 opacity-85 z-10 rotate-2 shadow-xs border-r border-pink-200"></div>
                          <div className="w-56 h-56 overflow-hidden bg-stone-50 border border-stone-100">
                            <img
                              alt={currentOutfit.companion.name}
                              className="w-full h-full object-cover"
                              src={currentOutfit.companion.image}
                            />
                          </div>
                        </div>
                        <p className="handwritten text-on-background text-center text-lg font-bold mt-4">
                          {currentOutfit.companion.name}
                        </p>
                        <p className="text-[11px] text-stone-400 font-sans text-center mt-1">
                          {currentOutfit.companion.tag || "Today's Choice"}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-stone-50/50 border-2 border-dashed border-stone-200 p-8 rounded-2xl flex flex-col items-center justify-center min-h-[250px] w-56 mx-auto sm:mx-0 sm:mt-16">
                        <p className="text-xs text-stone-400 text-center font-serif italic">추천 코디를 매칭할 수 있는<br/>다른 옷들을 업로드해 보세요!</p>
                      </div>
                    )}

                    {/* Style Diary Note Card spanning full width below Polaroids */}
                    <div className="sm:col-span-2 mt-8 w-full">
                      <div className="bg-secondary-container/15 p-6 rounded-2xl border-2 border-dashed border-secondary/25 relative rotate-0.5 shadow-xs">
                        
                        {/* Pushpin decorative element */}
                        <Pin className="w-7 h-7 absolute -top-4 -right-2 text-secondary fill-secondary/80 transform rotate-12" />
                        
                        <h3 className="font-serif text-xl font-black text-secondary mb-3 flex items-center gap-2 select-none">
                          {diaryNote.title}
                          {diaryNote.source && (
                            <span className="text-[10px] bg-white text-secondary font-bold px-1.5 py-0.5 rounded-full border border-secondary-container/80 font-sans">
                              {diaryNote.source}
                            </span>
                          )}
                        </h3>
                        <p className="font-serif text-md text-stone-700 leading-relaxed font-semibold italic">
                          {diaryNote.text}
                        </p>

                        {/* Save look action */}
                        {currentOutfit.top && (
                          <div className="mt-5 pt-3 border-t border-secondary/10 flex justify-end">
                            <button
                              onClick={handleSaveClick}
                              disabled={isSaved}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSaved
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-secondary text-white hover:opacity-90 active:scale-95'
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : 'fill-none'}`} />
                              {isSaved ? '다이어리에 기록 완료!' : '이 코디 다이어리에 저장'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Navigation footer buttons */}
                  <div className="flex items-center justify-between pt-10 border-t border-stone-100">
                    <button
                      onClick={() => setStage('selection')}
                      className="px-4 py-2 text-xs font-bold border border-stone-200 text-stone-500 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                      기분 다시 적기 🔄
                    </button>
                    
                    <button
                      onClick={() => setStage('welcome')}
                      className="px-4 py-2 text-xs font-bold bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      처음 화면으로 🏠
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>


      </main>
    </div>
  );
}
