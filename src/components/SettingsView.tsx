import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, HelpCircle, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

interface SettingsViewProps {
  profile: UserProfile;
  onUpdateProfile: (newProfile: UserProfile) => void;
  engineMode: 'local' | 'gemini';
  onChangeEngineMode: (mode: 'local' | 'gemini') => void;
  geminiKeyConfigured: boolean;
}

const PRESET_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBmIqvu91tgcsJSfe4DZiQsxDrmpOrbRXvhRw5SrgrhY_xENqUANileREMCfbvxB57YYJ-atLnMB0OMJb5B4-oyvZZ7Nc8N4b3H65YP23OObYE7cX4iUTI4AP-9UAokcgwRP3gcO8BOBXPPzcyTnEkYGElpdwu4D_ldYDGaP_e_koXrQm5cCKpUKtAgk5_-tgYuygmNTJ9j7l8vyURQXSxGhrX8K2rDvds722n1EQNXBFPDMUb2xnnhpcxGWW14U2x0ejg5mGWqilYp', // default sketch
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80', // French chic portrait
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80', // bright smile girl
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80', // retro mood portrait
];

export default function SettingsView({
  profile,
  onUpdateProfile,
  engineMode,
  onChangeEngineMode,
  geminiKeyConfigured,
}: SettingsViewProps) {
  const [name, setName] = useState(profile.name);
  const [subtitle, setSubtitle] = useState(profile.subtitle);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ name: name.trim(), subtitle: subtitle.trim(), avatar });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="w-full max-w-[900px] mx-auto mt-6 md:mt-16 px-4 pb-16">
      <div className="bg-white rounded-3xl p-6 md:p-12 border border-stone-200/50 shadow-sm min-h-[900px] relative">
        
        <div className="mb-8 ml-4 md:ml-10">
          <h1 className="font-serif text-3xl md:text-4xl font-black text-on-background tracking-tight flex items-center gap-2">
            <Settings className="w-8 h-8 text-secondary" />
            다이어리 설정
          </h1>
          <p className="font-serif text-sm text-stone-500 italic mt-1">
            프로필 정보를 수정하고 인공지능 스타일링 엔진을 설정해 보세요.
          </p>
        </div>

        <div className="ml-4 md:ml-10 max-w-xl space-y-8">
          
          {/* Profile Modification Form */}
          <form onSubmit={handleSave} className="space-y-6 bg-stone-50 p-6 rounded-2xl border border-stone-200/60">
            <h3 className="text-sm font-bold text-on-background flex items-center gap-1.5">
              🎨 나의 프로필 설정
            </h3>

            {/* Profile Avatar Selection */}
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
                프로필 아바타 선택
              </label>
              <div className="flex flex-wrap gap-3 items-center">
                {PRESET_AVATARS.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${
                      avatar === av
                        ? 'border-secondary scale-110 shadow-sm ring-2 ring-secondary-container'
                        : 'border-white'
                    }`}
                  >
                    <img src={av} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}

                <div className="flex-grow pl-3 border-l border-stone-200">
                  <label className="block text-[10px] font-bold text-stone-400">직접 이미지 URL 입력</label>
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full mt-1 px-3 py-1 text-xs border border-stone-200 rounded-lg focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>
            </div>

            {/* Profile Name & Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">
                  다이어리 이름 / 닉네임
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:border-secondary focus:outline-none bg-white font-serif text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">
                  소개글 / 상태 메시지
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:border-secondary focus:outline-none bg-white text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaved}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSaved
                    ? 'bg-emerald-500 text-white'
                    : 'bg-secondary text-white hover:opacity-90 active:scale-95'
                }`}
              >
                {isSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    수정 완료!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    프로필 저장하기
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Style Engine Configuration Card */}
          <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200/60 space-y-5">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-bold text-on-background flex items-center gap-1.5">
                🤖 인공지능 추천 엔진 설정
              </h3>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                geminiKeyConfigured
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-yellow-50 text-yellow-600 border-yellow-200'
              }`}>
                {geminiKeyConfigured ? 'Gemini API: 연결됨' : 'Gemini API: 미설정 (데모 모드)'}
              </span>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed font-medium">
              코디 추천 시작 버튼을 눌렀을 때 작동할 엔진을 선택해 보세요. Gemini AI 모드를 활성화하면 
              나의 실제 옷장 아이템들을 바탕으로 구글의 최첨단 인공지능 모델 <strong>gemini-3.5-flash</strong>가 
              감성적인 코디 제목과 맞춤형 코디 평을 작성해 줍니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Local Engine */}
              <button
                onClick={() => onChangeEngineMode('local')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  engineMode === 'local'
                    ? 'border-secondary bg-secondary-container/10 ring-2 ring-secondary-container'
                    : 'border-stone-200 hover:border-secondary-container bg-white'
                }`}
              >
                <div className="font-bold text-sm text-on-background">스마트 로컬 추천 🧩</div>
                <div className="text-[10px] text-stone-400 mt-1 leading-relaxed">
                  인터넷 연결이 필요 없는 클래식한 감성 코디 조합과 미리 정의된 무드 어드바이스를 통해 빠르게 코디를 매칭합니다.
                </div>
              </button>

              {/* Gemini Engine */}
              <button
                onClick={() => onChangeEngineMode('gemini')}
                className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                  engineMode === 'gemini'
                    ? 'border-secondary bg-secondary-container/10 ring-2 ring-secondary-container'
                    : 'border-stone-200 hover:border-secondary-container bg-white'
                }`}
              >
                <Sparkles className="w-4 h-4 text-secondary absolute top-3 right-3 fill-secondary/10" />
                <div className="font-bold text-sm text-on-background">Vanguard Gemini AI 추천 ✨</div>
                <div className="text-[10px] text-stone-400 mt-1 leading-relaxed">
                  상의, 하의, 아우터, 악세서리 등 실제 내 옷장의 맥락을 파악하고 기분/날씨 무드에 딱 어울리는 감성 다이어리를 맞춤 작성합니다.
                </div>
              </button>

            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] text-blue-600 font-medium leading-normal">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                Gemini API 키는 AI Studio의 <strong>Settings &gt; Secrets</strong> 패널에서 GEMINI_API_KEY 환경 변수로 안전하게 주입됩니다.
                키가 지정되지 않은 경우, 앱은 오류를 내지 않고 자동으로 로컬 똑똑 매칭 모드로 백업 작동합니다.
              </span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
