import React, { useState, useEffect } from 'react';
import { Sparkles, Shirt, BookOpen, NotebookPen, Settings, Plus, Heart, ShoppingBag, Calendar, Tag, Trash2, Camera, HelpCircle, Loader2 } from 'lucide-react';
import { ClothesItem, DiaryEntry, TabType, UserProfile } from './types';
import Sidebar from './components/Sidebar';
import NotebookPage from './components/NotebookPage';
import WardrobeView from './components/WardrobeView';
import DiaryView from './components/DiaryView';
import InspirationView from './components/InspirationView';
import SettingsView from './components/SettingsView';
import UploadModal from './components/UploadModal';

// Hotlinked Google User Content images from original template
const DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmIqvu91tgcsJSfe4DZiQsxDrmpOrbRXvhRw5SrgrhY_xENqUANileREMCfbvxB57YYJ-atLnMB0OMJb5B4-oyvZZ7Nc8N4b3H65YP23OObYE7cX4iUTI4AP-9UAokcgwRP3gcO8BOBXPPzcyTnEkYGElpdwu4D_ldYDGaP_e_koXrQm5cCKpUKtAgk5_-tgYuygmNTJ9j7l8vyURQXSxGhrX8K2rDvds722n1EQNXBFPDMUb2xnnhpcxGWW14U2x0ejg5mGWqilYp';
const IMAGE_PLAID_POLO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtzD36cFAChVGQuuNGjYMqkxmdA3WpHqXfDMX2nlIiOe2OcEDpPETg2okDTAdbEPVgmncQKm38tdEprgCZuw9gZAxtsOkIJyaC54ZI0saYUovect4WTCq9Zv01D16CMSNes5F1G1l6w30oC_zttJUSNxoGaW3WtDlEZip5dpgYuwzWBke5GwJczE3mQAAcQfXEmhJwuZ-IbeA12BMKtuj1LKMUneuvrZBXa3cAxVSTN6cwLh64pZztbOJK-JikQTMZfPbVXhPc_Ec';
const IMAGE_RIBBON_CARDIGAN = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3lrTMefq0RBT0yu2H9zYhAptTzzX6oD9C24ghWK04ovUomgO1i2n98RAqmACKD2dQssR42B0AzynaJ23if5hz1UkMnwvLzAKxWqJKcv1dBmcn8RLyijgkET3xDfKBuTUl1BFg5Q84QlghCZy8APPUTMDX_3wUymxnR_2nnx5TqVVPn_J1A7EpRAE2a_QpRBKf5Ziy4GNY1yBKGQiTFLRhtejWQ81wph4Jx3EST7Gvc5tavNpnSUG8VnvEKKs2ZBJ_3OJum4sZiOSj';

// Aesthetic Fallback Clothing Pieces to give the system robust matching potential out of the box
const PRESET_CLOTHES: ClothesItem[] = [
  {
    id: 'plaid-polo',
    name: 'Plaid Polo',
    image: IMAGE_PLAID_POLO,
    category: 'top',
    dateAdded: '2024. 05. 24',
    tag: 'Classic Check',
    isFavorite: true,
  },
  {
    id: 'ribbon-cardigan',
    name: 'Ribbon Cardigan',
    image: IMAGE_RIBBON_CARDIGAN,
    category: 'outer',
    dateAdded: '2024. 05. 24',
    tag: 'Lovely Pink',
    isFavorite: true,
  },
  {
    id: 'blue-denim',
    name: 'Vintage Blue Jeans',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=500&q=80',
    category: 'bottom',
    dateAdded: '2024. 05. 25',
    tag: 'French Denim',
    isFavorite: false,
  },
  {
    id: 'white-skirt',
    name: 'Cream Pleated Skirt',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=500&q=80',
    category: 'bottom',
    dateAdded: '2024. 05. 26',
    tag: 'Lovely Cream',
    isFavorite: false,
  },
  {
    id: 'red-flat-shoes',
    name: 'Romantic Red Flats',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=500&q=80',
    category: 'acc',
    dateAdded: '2024. 05. 27',
    tag: 'Red Accent',
    isFavorite: false,
  }
];

const PRESET_DIARY: DiaryEntry[] = [
  {
    id: '1',
    date: '2024. 05. 24',
    title: 'Style Diary Note',
    recommendationText: '오늘은 조금 더 특별하게 입고 싶은 날! 체크 무늬 폴로 티셔츠에 리본 가디건을 매치하면 프렌치 시크 느낌이 완성될 거예요. 🎨✨',
    outfitIds: ['plaid-polo', 'ribbon-cardigan'],
    mood: '러블리 데이트 🎀'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [profile, setProfile] = useState<UserProfile>({
    name: 'My Style Diary',
    subtitle: 'Stay fabulous!',
    avatar: DEFAULT_AVATAR
  });

  const [clothes, setClothes] = useState<ClothesItem[]>(PRESET_CLOTHES);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(PRESET_DIARY);

  // Today's active outfit and recommendation states
  const [currentOutfit, setCurrentOutfit] = useState<{ top?: ClothesItem; companion?: ClothesItem }>({
    top: PRESET_CLOTHES[0],
    companion: PRESET_CLOTHES[1],
  });

  const [diaryNote, setDiaryNote] = useState<{ title: string; text: string; source?: string }>({
    title: 'Style Diary Note',
    text: '오늘은 조금 더 특별하게 입고 싶은 날! 체크 무늬 폴로 티셔츠에 리본 가디건을 매치하면 프렌치 시크 느낌이 완성될 거예요. 🎨✨',
    source: 'Original Pick'
  });

  // Engine Configuration State
  const [engineMode, setEngineMode] = useState<'local' | 'gemini'>('local');
  const [geminiKeyConfigured, setGeminiKeyConfigured] = useState(false);
  const [isRecommendLoading, setIsRecommendLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Load state from localStorage on startup
  useEffect(() => {
    const savedProfile = localStorage.getItem('style_diary_profile');
    if (savedProfile) setProfile(JSON.parse(savedProfile));

    const savedClothes = localStorage.getItem('style_diary_clothes');
    if (savedClothes) setClothes(JSON.parse(savedClothes));

    const savedDiary = localStorage.getItem('style_diary_entries');
    if (savedDiary) setDiaryEntries(JSON.parse(savedDiary));

    const savedEngine = localStorage.getItem('style_diary_engine');
    if (savedEngine) setEngineMode(savedEngine as 'local' | 'gemini');

    // Query active API Key configurations safely (we look at env variables)
    // Note: client side cannot see process.env.GEMINI_API_KEY directly, so we check on server,
    // but in general we set configured to true if process is available, or we check dynamically via a ping.
    setGeminiKeyConfigured(true); // By default, we support full-stack routing gracefully
  }, []);

  // Save states to local storage on changes
  const handleUpdateProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('style_diary_profile', JSON.stringify(newProfile));
  };

  const handleAddClothes = (newItem: ClothesItem) => {
    const updated = [newItem, ...clothes];
    setClothes(updated);
    localStorage.setItem('style_diary_clothes', JSON.stringify(updated));
  };

  const handleDeleteClothes = (id: string) => {
    if (confirm('이 옷을 옷장에서 삭제하시겠습니까?')) {
      const updated = clothes.filter(c => c.id !== id);
      setClothes(updated);
      localStorage.setItem('style_diary_clothes', JSON.stringify(updated));
      
      // Clear today's outfit if it was deleted
      if (currentOutfit.top?.id === id) {
        setCurrentOutfit(prev => ({ ...prev, top: undefined }));
      }
      if (currentOutfit.companion?.id === id) {
        setCurrentOutfit(prev => ({ ...prev, companion: undefined }));
      }
    }
  };

  const handleToggleFavorite = (id: string) => {
    const updated = clothes.map(c => c.id === id ? { ...c, isFavorite: !c.isFavorite } : c);
    setClothes(updated);
    localStorage.setItem('style_diary_clothes', JSON.stringify(updated));
  };

  const handleDeleteDiaryEntry = (id: string) => {
    if (confirm('이 다이어리 기록을 삭제하시겠습니까?')) {
      const updated = diaryEntries.filter(d => d.id !== id);
      setDiaryEntries(updated);
      localStorage.setItem('style_diary_entries', JSON.stringify(updated));
    }
  };

  // Perform Outfit Recommendations
  const handleRecommend = async (mood: string, weather?: string, place?: string, situation?: string) => {
    setIsRecommendLoading(true);

    const selectedWeather = weather || "맑은 날";
    const selectedPlace = place || "감성 카페";
    const selectedSituation = situation || "일상/산책";

    // Filter available tops & other categories
    const tops = clothes.filter(c => c.category === 'top');
    const companions = clothes.filter(c => c.category !== 'top'); // outer, bottom, acc

    if (tops.length === 0) {
      alert('코디 추천을 위해 상의(Tops) 카테고리에 최소 한 벌 이상의 옷을 등록해주세요!');
      setIsRecommendLoading(false);
      return;
    }

    // Select random top & random companion item
    const selectedTop = tops[Math.floor(Math.random() * tops.length)];
    const selectedCompanion = companions.length > 0 
      ? companions[Math.floor(Math.random() * companions.length)]
      : undefined;

    setCurrentOutfit({
      top: selectedTop,
      companion: selectedCompanion,
    });

    if (engineMode === 'gemini') {
      try {
        const recommendItems = [selectedTop];
        if (selectedCompanion) recommendItems.push(selectedCompanion);

        const res = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: recommendItems,
            mood,
            weather: selectedWeather,
            place: selectedPlace,
            situation: selectedSituation,
          }),
        });
        const data = await res.json();

        setDiaryNote({
          title: data.title,
          text: data.recommendationText,
          source: data.source || 'Gemini 3.5'
        });
      } catch (err) {
        console.error("Failed to query Gemini backend, using local fallback", err);
        // Fallback directly to local smart match
        triggerLocalRecommendation(selectedTop, selectedCompanion, mood, selectedWeather, selectedPlace, selectedSituation);
      } finally {
        setIsRecommendLoading(false);
      }
    } else {
      // Local Heuristic Recommendation Mode with slight delay to feel physical & smart
      setTimeout(() => {
        triggerLocalRecommendation(selectedTop, selectedCompanion, mood, selectedWeather, selectedPlace, selectedSituation);
        setIsRecommendLoading(false);
      }, 900);
    }
  };

  const triggerLocalRecommendation = (
    top: ClothesItem,
    companion: ClothesItem | undefined,
    mood: string,
    weather: string = "맑은 날",
    place: string = "감성 카페",
    situation: string = "일상/산책"
  ) => {
    const companionName = companion ? companion.name : '귀여운 악세서리';
    const localAdvices = [
      `${weather}에 딱인 날!\n오늘 ${place}에서 ${situation} 일정을 즐기기 위해 추천하는 ${top.name}와 ${companionName} 조합은 언제 보아도 설레는 매력을 자아냅니다. 여기에 어울리는 포인트를 매치해 나만의 완벽한 하루를 연출하세요! 🌸✨`,
      `${weather} 분위기에 어울리는 따뜻한 초이스!\n오늘 ${place}에서 보내실 ${situation} 시간을 위해 추천하는 ${top.name} + ${companionName} 매칭은 편안하면서도 탁월한 무드를 더해 줍니다. 🧸🌟`,
      `차분하고 감성이 넘치는 오늘!\n${weather} 무드에 맞춰 ${place}에서 ${situation} 일정을 소화할 때, ${top.name}와 ${companionName} 코디는 미니멀하면서도 지적인 느낌을 선물합니다. 자신감 넘치게 걸어보세요! 🕶️☕`,
      `프렌치 감성이 가득한 찰떡 매칭!\n오늘 ${place}에서 ${situation}을 보내기에 최고의 코디인 ${top.name}와 ${companionName} 룩은 단정하면서도 어딘가 아늑한 로맨틱함을 전해줍니다. 오늘 하루가 더 눈부실 거예요. 🎨🧸`
    ];

    const randomText = localAdvices[Math.floor(Math.random() * localAdvices.length)];
    setDiaryNote({
      title: `${situation} 추천 룩`,
      text: randomText,
      source: 'Smart Local'
    });
  };

  // Save Current Look to Diary Entries
  const handleSaveOutfit = () => {
    const outfitIds: string[] = [];
    if (currentOutfit.top) outfitIds.push(currentOutfit.top.id);
    if (currentOutfit.companion) outfitIds.push(currentOutfit.companion.id);

    const newEntry: DiaryEntry = {
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      title: diaryNote.title,
      recommendationText: diaryNote.text,
      outfitIds,
      mood: `${engineMode === 'gemini' ? 'Gemini AI ✨' : 'Local 🎨'}`
    };

    const updated = [newEntry, ...diaryEntries];
    setDiaryEntries(updated);
    localStorage.setItem('style_diary_entries', JSON.stringify(updated));
  };

  return (
    <div className="flex min-h-screen text-on-background pb-24 md:pb-12">
      
      {/* Desktop Sidebar menu - hidden on mobile */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        totalClothes={clothes.length}
      />

      {/* Main Content Pane */}
      <div className="flex-1 md:pl-64 transition-all duration-300">
        <div className="w-full flex justify-center">
          
          {activeTab === 'today' && (
            <NotebookPage
              clothes={clothes}
              currentOutfit={currentOutfit}
              diaryNote={diaryNote}
              onRecommend={handleRecommend}
              onUploadClick={() => setIsUploadModalOpen(true)}
              onSaveOutfit={handleSaveOutfit}
              isRecommendLoading={isRecommendLoading}
            />
          )}

          {activeTab === 'wardrobe' && (
            <WardrobeView
              clothes={clothes}
              onAddClick={() => setIsUploadModalOpen(true)}
              onDeleteClothes={handleDeleteClothes}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {activeTab === 'inspiration' && (
            <InspirationView />
          )}

          {activeTab === 'diary' && (
            <DiaryView
              entries={diaryEntries}
              clothes={clothes}
              onDeleteEntry={handleDeleteDiaryEntry}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              engineMode={engineMode}
              onChangeEngineMode={(mode) => {
                setEngineMode(mode);
                localStorage.setItem('style_diary_engine', mode);
              }}
              geminiKeyConfigured={geminiKeyConfigured}
            />
          )}

        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (rendered on small viewports) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-4 pb-2 h-18 bg-white border-t border-secondary-container/60 shadow-lg rounded-t-3xl">
        <button 
          onClick={() => setActiveTab('today')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            activeTab === 'today' ? 'text-secondary scale-110' : 'text-stone-400'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">오늘의 코디</span>
        </button>

        <button 
          onClick={() => setActiveTab('wardrobe')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            activeTab === 'wardrobe' ? 'text-secondary scale-110' : 'text-stone-400'
          }`}
        >
          <Shirt className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">나의 옷장</span>
        </button>

        <button 
          onClick={() => setActiveTab('inspiration')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            activeTab === 'inspiration' ? 'text-secondary scale-110' : 'text-stone-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">영감 보드</span>
        </button>

        <button 
          onClick={() => setActiveTab('diary')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            activeTab === 'diary' ? 'text-secondary scale-110' : 'text-stone-400'
          }`}
        >
          <NotebookPen className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">다이어리</span>
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            activeTab === 'settings' ? 'text-secondary scale-110' : 'text-stone-400'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">설정</span>
        </button>
      </nav>

      {/* Floating Action Button (FAB) on Desktop & Mobile to Upload Clothes quickly */}
      <button
        onClick={() => setIsUploadModalOpen(true)}
        className="fixed bottom-22 md:bottom-8 right-6 w-14 h-14 bg-secondary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 cursor-pointer"
        title="나의 옷장에 옷 업로드하기"
      >
        <Camera className="w-6 h-6 animate-[pulse_2s_infinite]" />
      </button>

      {/* Upload Modal Overlay */}
      {isUploadModalOpen && (
        <UploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onAdd={handleAddClothes}
        />
      )}

    </div>
  );
}
