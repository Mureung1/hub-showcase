import React, { useRef } from "react";
import { UserProfile } from "../types";
import { Sliders, User, ShieldAlert, Monitor, Sparkles, Upload } from "lucide-react";

interface SystemTabProps {
  profile: UserProfile;
  onChangeProfile: (p: UserProfile) => void;
  vaporMode: boolean;
  onToggleVaporMode: () => void;
  scanlineOpacity: number;
  onChangeScanline: (opacity: number) => void;
  onResetApp: () => void;
}

export default function SystemTab({
  profile,
  onChangeProfile,
  vaporMode,
  onToggleVaporMode,
  scanlineOpacity,
  onChangeScanline,
  onResetApp
}: SystemTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onChangeProfile({
            ...profile,
            avatarUrl: event.target.result as string
          });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Upper Window: Profile Configuration */}
      <div className="bg-surface border-4 border-primary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        {/* Title Bar */}
        <div className="bg-primary text-on-primary px-3 py-2 flex justify-between items-center border-b-4 border-primary">
          <div className="font-label-sm text-label-sm uppercase flex items-center space-x-2 font-bold">
            <User size={16} />
            <span>USER_PROFILE_CONFIG.SYS [유저 프로필 설정]</span>
          </div>
          <div className="flex space-x-1">
            <div className="w-3.5 h-3.5 bg-surface border-2 border-on-primary"></div>
            <div className="w-3.5 h-3.5 bg-error border-2 border-on-primary"></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 bg-surface bg-notebook grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Avatar Area */}
          <div className="md:col-span-4 flex flex-col items-center space-y-4">
            <div className="w-28 h-28 bg-surface-container-lowest border-4 border-secondary p-1 overflow-hidden relative shadow-[4px_4px_0_0_#000] hover:scale-105 transition-transform cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img
                src={profile.avatarUrl}
                alt="Profile Avatar"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                <Upload size={18} className="text-secondary" />
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 bg-surface border border-outline text-on-surface hover:border-secondary font-label-sm text-[10px] uppercase font-bold"
            >
              CHANGE AVATAR
            </button>
          </div>

          {/* Form Area */}
          <div className="md:col-span-8 space-y-4">
            <div className="space-y-1">
              <label className="font-label-sm text-xs text-primary uppercase">NICKNAME (닉네임)</label>
              <input
                type="text"
                value={profile.username}
                onChange={(e) => onChangeProfile({ ...profile, username: e.target.value })}
                className="w-full bg-surface border-2 border-primary p-3 font-label-sm text-sm text-on-surface focus:outline-none"
                maxLength={16}
              />
            </div>

            <div className="bg-surface-container border border-outline-variant p-4 font-body-md text-xs text-on-surface-variant leading-relaxed">
              <p className="font-bold text-secondary uppercase mb-1 font-label-sm">System Registry Notes:</p>
              <p>
                닉네임과 프로필 사진은 로컬 스토리지에 자동 보존되며, 상단 프로필 패널과 스타일링 달력 출력에 반영됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Center Window: Aesthetic Modulators */}
      <div className="bg-surface border-4 border-secondary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        {/* Title Bar */}
        <div className="bg-secondary text-on-secondary-fixed px-3 py-2 flex justify-between items-center border-b-4 border-secondary">
          <div className="font-label-sm text-label-sm uppercase flex items-center space-x-2 font-bold">
            <Monitor size={16} />
            <span>AESTHETIC_MODULATORS.DLL [테마 및 그래픽 조정]</span>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-surface-container space-y-6">
          {/* Vapor Mode toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-outline-variant bg-surface-container-low">
            <div className="space-y-1.5 max-w-md">
              <h4 className="font-headline-md text-sm text-secondary uppercase flex items-center gap-1.5 font-bold">
                <Sparkles size={14} className="text-secondary" />
                <span>NEON VAPOR MODE (네온 베이퍼 모드)</span>
              </h4>
              <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
                활성화 시, 형광 핑크와 시안 컬러 광채 이펙트가 테두리 및 그림자에 주입되어 레트로-웨이브 감성이 극대화됩니다.
              </p>
            </div>
            
            <button
              onClick={onToggleVaporMode}
              className={`px-5 py-2.5 font-label-sm text-xs font-bold uppercase border-2 shadow-[2px_2px_0_0_#000] active:translate-x-[2px] transition-all cursor-pointer ${
                vaporMode
                  ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed"
                  : "bg-surface text-secondary border-secondary"
              }`}
            >
              {vaporMode ? "VAPOR_STIMULATION_ON" : "SYSTEM_STANDBY_OFF"}
            </button>
          </div>

          {/* CRT scanlines modulator slider */}
          <div className="p-4 border border-outline-variant bg-surface-container-low space-y-4">
            <div className="space-y-1">
              <h4 className="font-headline-md text-sm text-secondary uppercase font-bold">
                CRT_SCANLINE_INTENSITY (브라운관 주사선 조절)
              </h4>
              <p className="font-body-md text-xs text-on-surface-variant">
                레트로 CRT 모니터의 빈티지 질감을 조절해 보세요. (0% 적용 시, 깨끗하고 선명한 화면으로 감상할 수 있습니다.)
              </p>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="0.4"
                step="0.05"
                value={scanlineOpacity}
                onChange={(e) => onChangeScanline(parseFloat(e.target.value))}
                className="flex-1 h-2.5 bg-surface rounded-none border border-outline appearance-none cursor-pointer accent-secondary"
              />
              <span className="font-label-sm text-xs text-secondary w-12 text-right font-bold">
                {(scanlineOpacity * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Window: Danger Zone */}
      <div className="bg-surface border-4 border-outline-variant shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        {/* Title Bar */}
        <div className="bg-surface-container-highest text-on-surface-variant px-3 py-1.5 flex justify-between items-center border-b-2 border-outline-variant">
          <div className="font-label-sm text-xs uppercase flex items-center space-x-1.5 font-bold">
            <ShieldAlert size={14} className="text-error" />
            <span>CRITICAL AREA: INVENTORY RESET [데이터 초기화]</span>
          </div>
        </div>

        <div className="p-5 bg-surface-container-lowest space-y-4">
          <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
            이 버튼을 클릭하면 로컬 저장소에 등록된 모든 커스텀 옷장 아이템, 저장된 스타일 코디, 일기장 일정이 초기화되고 초기 데모 데이터로 강제 리셋됩니다.
          </p>

          <button
            onClick={() => {
              if (confirm("정말로 모든 옷장과 코디 데이터를 지우고 초기 상태로 되돌리시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
                onResetApp();
              }
            }}
            className="px-4 py-2 bg-error text-on-error hover:brightness-110 font-label-sm text-xs font-bold uppercase border border-black shadow-[2px_2px_0_0_#000] hover:translate-y-[1px] cursor-pointer"
          >
            HARDWARE_RESET.BAT
          </button>
        </div>
      </div>
    </div>
  );
}
