import React, { useState } from 'react';
import { 
  UploadCloud, Video, Instagram, Info, MapPin, 
  Store, Home, Wand2, FolderHeart, TrendingUp, ChevronRight
} from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'generate'
  const [selectedImage, setSelectedImage] = useState(null);

  // Sidebar Component
  const Sidebar = () => (
    <div className="w-64 bg-surface border-r border-borderLine flex flex-col p-6 h-full shadow-sm relative z-10">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Video className="text-primary w-5 h-5" />
        </div>
        <h1 className="text-xl font-extrabold text-textMain tracking-tight">ShortsGen</h1>
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        <button 
          onClick={() => setCurrentView('home')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-colors ${currentView === 'home' ? 'bg-primary text-white shadow-block' : 'text-textMuted hover:bg-background'}`}
        >
          <Home className="w-5 h-5" />
          대시보드 홈
        </button>
        <button 
          onClick={() => setCurrentView('generate')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-colors ${currentView === 'generate' ? 'bg-primary text-white shadow-block' : 'text-textMuted hover:bg-background'}`}
        >
          <Wand2 className="w-5 h-5" />
          릴스 생성소
        </button>
        <button className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-textMuted hover:bg-background transition-colors">
          <FolderHeart className="w-5 h-5" />
          내 보관함
        </button>
      </nav>

      <div className="mt-auto bg-background p-4 rounded-2xl border border-borderLine flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
          <Store className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-textMain">사장님 계정</p>
          <p className="text-xs font-medium text-textMuted">베이커리 카페</p>
        </div>
      </div>
    </div>
  );

  // Home View Component
  const HomeView = () => (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      
      {/* 1. Profile Setup Data */}
      <div className="bg-surface rounded-3xl p-8 shadow-block border border-borderLine flex flex-col gap-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-textMain">
          <Store className="w-6 h-6 text-primary" />
          매장 기본 정보
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-textMuted flex items-center gap-1">업종 카테고리</label>
            <div className="relative">
              <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted/60" />
              <input type="text" className="w-full bg-background border border-borderLine rounded-2xl py-4 pl-12 pr-4 text-base font-bold focus:outline-none focus:border-primary" defaultValue="베이커리 카페" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-textMuted flex items-center gap-1">위치 (동/지역)</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted/60" />
              <input type="text" className="w-full bg-background border border-borderLine rounded-2xl py-4 pl-12 pr-4 text-base font-bold focus:outline-none focus:border-primary" defaultValue="마포구 연남동" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Trend Analysis */}
      <div className="bg-surface rounded-3xl p-8 shadow-block border border-borderLine flex flex-col gap-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-textMain">
          <TrendingUp className="w-6 h-6 text-secondary" />
          실시간 SNS 트렌드 분석
        </h2>
        <p className="text-sm font-medium text-textMuted">사장님의 '베이커리 카페'에 딱 맞는 오늘의 추천 키워드입니다.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-background rounded-2xl p-5 border border-borderLine flex flex-col gap-2">
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md w-fit">추천 1순위</span>
            <p className="font-extrabold text-lg text-textMain">#빵지순례</p>
            <p className="text-xs text-textMuted">현재 틱톡 디저트 카테고리 급상승</p>
          </div>
          <div className="bg-background rounded-2xl p-5 border border-borderLine flex flex-col gap-2">
            <span className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-1 rounded-md w-fit">추천 2순위</span>
            <p className="font-extrabold text-lg text-textMain">#겉바속촉</p>
            <p className="text-xs text-textMuted">크루아상, 소금빵과 매칭률 높음</p>
          </div>
          <div className="bg-background rounded-2xl p-5 border border-borderLine flex flex-col gap-2">
            <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-md w-fit">지역 맞춤</span>
            <p className="font-extrabold text-lg text-textMain">#연남동데이트</p>
            <p className="text-xs text-textMuted">사장님 매장 위치 기반 검색량 1위</p>
          </div>
        </div>

        <button 
          onClick={() => setCurrentView('generate')}
          className="mt-4 bg-primary hover:bg-blue-500 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-md hover:-translate-y-1"
        >
          이 트렌드로 새 릴스 만들기 <ChevronRight className="w-5 h-5" />
        </button>
      </div>

    </div>
  );

  // Generate View Component
  const GenerateView = () => (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setCurrentView('home')} className="text-textMuted hover:text-textMain font-bold">홈</button>
        <span className="text-borderLine">/</span>
        <span className="font-bold text-primary">릴스 생성소 (AI 파이프라인)</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pipeline Input */}
        <div className="bg-surface rounded-3xl p-8 shadow-block border border-borderLine flex flex-col gap-6">
          <h2 className="text-xl font-bold text-textMain flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-primary" />
            소스 이미지 업로드
          </h2>
          <p className="text-sm font-medium text-textMuted">트렌드에 맞춰 홍보할 메뉴(예: 크루아상) 사진을 올려주세요.</p>
          
          <div 
            className="border-2 border-dashed border-primary/30 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer min-h-[300px]"
            onClick={() => setSelectedImage('croissant.jpg')}
          >
            {selectedImage ? (
              <div className="text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-white shadow-sm text-primary rounded-2xl flex items-center justify-center mb-4 text-2xl font-bold">✓</div>
                <p className="font-bold text-textMain text-lg">업로드 완료!</p>
                <div className="flex flex-col gap-2 mt-4 text-sm font-medium text-textMuted text-left bg-white p-4 rounded-xl border border-borderLine">
                  <p className="flex items-center gap-2"><span className="text-green-500">✔</span> YOLOv8 객체 분석 완료</p>
                  <p className="flex items-center gap-2"><span className="text-green-500">✔</span> KoBERT 해시태그 매칭</p>
                  <p className="flex items-center gap-2 text-primary animate-pulse">⏳ 비디오 렌더링 중...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center text-primary">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <p className="font-bold text-textMain">사진 드래그 앤 드롭</p>
              </>
            )}
          </div>
        </div>

        {/* Pipeline Output */}
        <div className="bg-surface rounded-3xl p-8 shadow-block border border-borderLine flex flex-col items-center justify-center gap-6">
          <h2 className="text-xl font-bold text-textMain w-full text-left">최종 렌더링 결과</h2>
          
          <div className="relative w-full max-w-[280px] aspect-[9/16] bg-background rounded-[2rem] overflow-hidden border-8 border-background shadow-inner">
            <div className="absolute inset-0 bg-[#FFF3E0] flex flex-col items-center justify-center overflow-hidden">
              <span className="text-8xl transform hover:scale-110 transition-transform duration-500">🥐</span>
              <div className="absolute inset-0 bg-black/10"></div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex flex-col justify-end p-5">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white/90 px-3 py-1.5 rounded-full text-xs font-extrabold text-primary shadow-sm">#빵지순례</span>
                </div>
                <h3 className="text-white font-extrabold text-xl leading-tight mt-1 drop-shadow-md">
                  갓 구운 버터 풍미 한가득!<br/>연남동 디저트 끝판왕
                </h3>
              </div>
            </div>
          </div>

          <button 
            className={`w-full max-w-[280px] py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-md ${selectedImage ? 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] text-white hover:opacity-90 hover:-translate-y-1' : 'bg-background text-textMuted border border-borderLine cursor-not-allowed'}`}
          >
            {selectedImage ? (
              <>
                <Instagram className="w-5 h-5" />
                원클릭 인스타그램 발행
              </>
            ) : (
              '결과물 대기 중...'
            )}
          </button>
        </div>

      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-background flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <header className="h-20 bg-background/80 backdrop-blur-md border-b border-borderLine flex items-center px-10 sticky top-0 z-20">
          <h2 className="font-extrabold text-textMain text-xl">
            {currentView === 'home' ? '대시보드 홈' : '릴스 생성소'}
          </h2>
        </header>
        <main className="p-10">
          {currentView === 'home' ? <HomeView /> : <GenerateView />}
        </main>
      </div>
    </div>
  );
}

export default App;
