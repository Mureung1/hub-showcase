import React, { useState } from 'react';
import { UploadCloud, Video, Instagram, Info, MapPin, Store } from 'lucide-react';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-surface/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-soft">
            <Video className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">ShortsGen AI</h1>
        </div>
        <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center">
          <span className="font-medium text-sm">사장님</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Left: Input Form */}
          <div className="flex flex-col gap-6">
            <div className="bg-surface p-8 rounded-2xl shadow-soft flex flex-col gap-5 border border-white/5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Store className="w-5 h-5 text-secondary" />
                가게 정보 입력
              </h2>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-textMuted">업종 카테고리</label>
                <div className="relative">
                  <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                  <input type="text" placeholder="예: 베이커리 카페" className="w-full bg-background border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-colors" defaultValue="베이커리 카페" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-textMuted">위치 (동/지역)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                  <input type="text" placeholder="예: 강남구 역삼동" className="w-full bg-background border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-colors" defaultValue="마포구 연남동" />
                </div>
              </div>
            </div>

            <div className="bg-surface p-8 rounded-2xl shadow-soft border border-white/5 flex flex-col gap-4">
              <h2 className="text-lg font-semibold">오늘의 사진 업로드</h2>
              <p className="text-sm text-textMuted">자랑하고 싶은 시그니처 메뉴나 매장 사진을 올려주세요.</p>
              
              <div 
                className="mt-2 border-2 border-dashed border-white/20 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 bg-background hover:border-primary transition-colors cursor-pointer"
                onClick={() => setSelectedImage('croissant.jpg')}
              >
                {selectedImage ? (
                  <div className="text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-3">✓</div>
                    <p className="font-medium">크루아상 사진 업로드 완료!</p>
                    <p className="text-xs text-textMuted mt-1">AI가 맛있게 분석 중입니다...</p>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-12 h-12 text-secondary" />
                    <div className="text-center">
                      <p className="font-medium text-sm">클릭하거나 사진을 드래그하세요</p>
                      <p className="text-xs text-textMuted mt-1">JPG, PNG (최대 10MB)</p>
                    </div>
                  </>
                )}
              </div>
              
              <button 
                className={`w-full py-4 rounded-xl font-semibold text-sm transition-all shadow-soft mt-2 ${selectedImage ? 'bg-primary text-background hover:opacity-90' : 'bg-white/10 text-textMuted cursor-not-allowed'}`}
              >
                AI 릴스 자동 생성하기
              </button>
            </div>
          </div>

          {/* Right: Video Preview */}
          <div className="bg-surface p-8 rounded-2xl shadow-soft border border-white/5 flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold w-full text-left mb-6">최종 숏폼 미리보기</h2>
            
            <div className="relative w-full max-w-[320px] aspect-[9/16] bg-background rounded-3xl overflow-hidden border-4 border-surface shadow-2xl">
              {/* Fake Video Content */}
              <div className="absolute inset-0 bg-[#D4A373] flex items-center justify-center">
                <span className="text-[#FAEDCD] text-6xl font-bold opacity-30">🥐</span>
              </div>
              
              {/* Overlay UI */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white">#빵지순례</span>
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white">#겉바속촉</span>
                  </div>
                  <h3 className="text-white font-bold text-lg leading-tight mt-1">
                    갓 구운 버터 풍미 한가득!<br/>연남동 디저트 끝판왕
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-6 h-6 bg-primary rounded-full"></div>
                    <span className="text-white/90 text-sm font-medium">연남동 카페</span>
                  </div>
                </div>
              </div>
            </div>

            <button className="mt-8 w-full max-w-[320px] bg-[#E1306C] hover:bg-[#C13584] text-white py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-soft">
              <Instagram className="w-5 h-5" />
              인스타그램으로 바로 발행
            </button>
          </div>
          
        </div>
      </main>
    </div>
  );
}

export default App;
