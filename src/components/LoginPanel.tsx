import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { Key, User, Shield, LogOut, CheckCircle, AlertCircle, Sparkles, RefreshCw, Eye, EyeOff, Terminal, ArrowRight, UserPlus, Lock } from "lucide-react";
import AvatarRenderer, { CUTE_AVATAR_DATA } from "./AvatarRenderer";
import { db, hashPassword } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface LoginPanelProps {
  profile: UserProfile;
  onChangeProfile: (profile: UserProfile) => void;
  vaporMode: boolean;
  onNavigateToHome?: () => void;
}

interface MockUser {
  username: string;
  password?: string;
  avatarUrl: string;
}

const PRESET_AVATARS = [
  { id: "cute-bunny", name: "아기토끼" },
  { id: "cute-kitty", name: "아기냥이" },
  { id: "cute-poodle", name: "보송푸들" },
  { id: "cute-bear", name: "말랑아기곰" },
  { id: "cute-fairy", name: "파스텔 인형" }
];

export default function LoginPanel({ profile, onChangeProfile, vaporMode, onNavigateToHome }: LoginPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"login" | "signup">("login");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  
  // Inputs
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>("");
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("cute-bunny");
  
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successAnimation, setSuccessAnimation] = useState<boolean>(false);

  // Initialize mock users on load if not present
  useEffect(() => {
    const savedLogin = localStorage.getItem("pmc_logged_in") === "true";
    if (savedLogin) {
      setIsLoggedIn(true);
      const storedName = localStorage.getItem("pmc_username") || "Cyber Stylist";
      const storedAvatar = localStorage.getItem("pmc_avatar") || "cute-bunny";
      setUsernameInput(storedName);
      setSelectedAvatarId(storedAvatar);
    }

    const currentUsers = localStorage.getItem("pmc_registered_users");
    if (!currentUsers) {
      const defaultUsers: MockUser[] = [
        { username: "cyberstar", password: "1234", avatarUrl: "cute-bunny" },
        { username: "pinkybear", password: "1234", avatarUrl: "cute-bear" },
        { username: "fairyangel", password: "1234", avatarUrl: "cute-fairy" }
      ];
      localStorage.setItem("pmc_registered_users", JSON.stringify(defaultUsers));
    }
  }, []);

  // Helper to load registered users
  const getRegisteredUsers = (): MockUser[] => {
    try {
      const data = localStorage.getItem("pmc_registered_users");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedUsername = usernameInput.trim();
    const docId = trimmedUsername.toLowerCase();
    if (!trimmedUsername) {
      setErrorMessage("유저네임을 입력해주세요! [ERR_EMPTY_USER]");
      return;
    }
    if (passwordInput.length < 4) {
      setErrorMessage("보안 비밀번호는 4자리 이상이어야 합니다! [ERR_SHORT_PASS]");
      return;
    }

    setSuccessAnimation(true);

    try {
      const userRef = doc(db, "users", docId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setSuccessAnimation(false);
        setErrorMessage("존재하지 않는 유저네임입니다! 회원가입 탭을 눌러 계정을 생성해보세요. [ERR_USER_NOT_FOUND]");
        return;
      }

      const userData = userSnap.data();
      const hashedPassword = await hashPassword(passwordInput);

      const isPlaintextMatch = userData.password === passwordInput;
      const isHashMatch = userData.password === hashedPassword;

      if (!isPlaintextMatch && !isHashMatch) {
        setSuccessAnimation(false);
        setErrorMessage("비밀번호가 일치하지 않습니다! [ERR_INVALID_PASSWORD]");
        return;
      }

      // Upgrade legacy plain-text password to safe hash
      if (isPlaintextMatch && !isHashMatch) {
        try {
          await setDoc(userRef, { password: hashedPassword }, { merge: true });
          console.log(`[Security] Upgraded user '${trimmedUsername}' to secure SHA-256 password hash.`);
        } catch (upgradeErr) {
          console.error("Failed to auto-upgrade legacy password:", upgradeErr);
        }
      }

      setIsLoggedIn(true);
      setSuccessAnimation(false);
      setSelectedAvatarId(userData.avatarUrl || "cute-bunny");

      // Save user session
      localStorage.setItem("pmc_logged_in", "true");
      localStorage.setItem("pmc_username", trimmedUsername);
      localStorage.setItem("pmc_avatar", userData.avatarUrl || "cute-bunny");

      // Sync profile state with app
      onChangeProfile({
        ...profile,
        username: trimmedUsername,
        avatarUrl: userData.avatarUrl || "cute-bunny"
      });

      if (onNavigateToHome) {
        onNavigateToHome();
      }
    } catch (err: any) {
      console.error("Firebase Login Error:", err);
      setSuccessAnimation(false);
      setErrorMessage(`로그인 중 서버 에러가 발생했습니다: ${err.message || err}`);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedUsername = usernameInput.trim();
    const docId = trimmedUsername.toLowerCase();
    if (!trimmedUsername) {
      setErrorMessage("원하는 유저네임을 입력하세요! [ERR_EMPTY_USER]");
      return;
    }
    if (trimmedUsername.length < 2) {
      setErrorMessage("유저네임은 2자 이상이어야 합니다! [ERR_SHORT_NAME]");
      return;
    }
    if (passwordInput.length < 4) {
      setErrorMessage("보안 비밀번호는 최소 4자리 이상 설정해야 합니다! [ERR_WEAK_PASS]");
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setErrorMessage("비밀번호와 비밀번호 확인 칸이 일치하지 않습니다! [ERR_PASS_MISMATCH]");
      return;
    }

    setSuccessAnimation(true);

    try {
      const userRef = doc(db, "users", docId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setSuccessAnimation(false);
        setErrorMessage("이미 사용 중인 유저네임입니다! 다른 이름을 선택하세요. [ERR_NAME_TAKEN]");
        return;
      }

      const hashedPassword = await hashPassword(passwordInput);

      // Write user to credentials collection securely
      await setDoc(userRef, {
        username: trimmedUsername,
        password: hashedPassword,
        avatarUrl: selectedAvatarId,
        createdAt: new Date().toISOString()
      });

      setSuccessAnimation(false);
      setSuccessMessage(`회원가입 완료! '${trimmedUsername}' 계정이 생성되었습니다. 이제 로그인을 시도하세요!`);
      
      // Auto toggle to login tab with fields preserved
      setActiveSubTab("login");
      setConfirmPasswordInput("");
    } catch (err: any) {
      console.error("Firebase Signup Error:", err);
      setSuccessAnimation(false);
      setErrorMessage(`회원가입 중 서버 에러가 발생했습니다: ${err.message || err}`);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsernameInput("");
    setPasswordInput("");
    setConfirmPasswordInput("");
    setErrorMessage(null);
    setSuccessMessage(null);
    localStorage.removeItem("pmc_logged_in");
    localStorage.removeItem("pmc_username");
    localStorage.removeItem("pmc_avatar");

    onChangeProfile({
      ...profile,
      username: "Cyber Stylist",
      avatarUrl: "cute-bunny"
    });
  };

  const activeAvatarName = CUTE_AVATAR_DATA[selectedAvatarId]?.name || "8-BIT CHARACTER";

  return (
    <div className="w-full flex flex-col space-y-6 animate-fade-in">
      {/* Interactive Title Header of the dedicated section */}
      <div className="flex flex-col space-y-2">
        <h2 className="font-headline-lg text-2xl font-bold uppercase text-primary tracking-wide flex items-center gap-2">
          <Terminal size={24} className="text-secondary animate-pulse" />
          <span>CYBER_AUTHENTICATION (로그인 포탈)</span>
        </h2>
        <p className="font-body-md text-xs text-on-surface-variant uppercase tracking-widest font-bold">
          원하는 파스텔 캐릭터를 프로필로 설정하고 가상 옷장 시스템에 접속하세요.
        </p>
      </div>

      <div className={`bg-surface border-4 ${isLoggedIn ? 'border-primary' : 'border-secondary'} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden`}>
        {/* Terminal Header */}
        <div 
          className={`px-4 py-2.5 flex justify-between items-center border-b-4 ${isLoggedIn ? 'bg-primary text-on-primary border-primary' : 'bg-secondary text-on-secondary-fixed border-secondary'} font-bold`}
        >
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
            <Shield size={14} className={successAnimation ? "animate-spin text-yellow-300" : ""} />
            <span>LOGIN.EXE — {isLoggedIn ? `ACCESS SECURED [USER: ${usernameInput.toUpperCase()}]` : "RECON_AUTH GATEWAY v1.4"}</span>
          </div>
          <span className="font-mono text-[9px] opacity-75 uppercase">
            {isLoggedIn ? "[STATUS: SECURE_LINK]" : "[STATUS: BYPASS_ENABLED]"}
          </span>
        </div>

        {/* Auth Terminal Panel Body */}
        <div className="p-4 md:p-6 bg-surface-container-low relative">
          
          {/* Sub Navigation Tabs (Login vs Register) - Only shown if logged out & not animating */}
          {!isLoggedIn && !successAnimation && (
            <div className="flex border-b-4 border-outline-variant mb-6 bg-surface-container">
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab("login");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-3 px-4 font-mono text-xs font-bold uppercase border-r-4 border-outline-variant flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeSubTab === "login" 
                    ? "bg-surface-bright text-primary border-b-4 border-b-transparent translate-y-[2px]" 
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <Lock size={12} />
                <span>🔑 SIGN IN (로그인)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab("signup");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-3 px-4 font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeSubTab === "signup" 
                    ? "bg-surface-bright text-primary border-b-4 border-b-transparent translate-y-[2px]" 
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <UserPlus size={12} />
                <span>📝 SIGN UP (회원가입)</span>
              </button>
            </div>
          )}

          {successAnimation ? (
            /* Loading / Progress animation overlay */
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <RefreshCw size={48} className="animate-spin text-primary" />
              <p className="font-mono text-sm font-bold text-primary animate-pulse tracking-widest">
                {activeSubTab === "login" 
                  ? "AUTHORIZING STYLIST DECK... CONNECTING VAPOR REGISTRY..." 
                  : "WRITING USER PROFILE DATA TO RETRO LOCAL_DATABASE..."}
              </p>
              <div className="w-64 h-3 bg-surface border-2 border-outline p-0.5 shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]">
                <div className="h-full bg-primary animate-pulse w-4/5 transition-all"></div>
              </div>
            </div>
          ) : !isLoggedIn ? (
            /* Dual-mode Form (Sign In / Sign Up) */
            <form onSubmit={activeSubTab === "login" ? handleLogin : handleSignUp} className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Side: Cute Pixel Character Selector */}
              <div className="md:col-span-5 flex flex-col items-center justify-center border-2 border-dashed border-outline-variant p-5 bg-surface-container-lowest">
                <span className="font-label-sm text-[10px] text-secondary font-mono font-bold uppercase mb-4 text-center">
                  {activeSubTab === "login" ? "[1] USER CHARACTER PREVIEW" : "[1] SELECT PROFILE CHARACTER"}
                </span>
                
                {/* Active character display with high fidelity pixel scaling */}
                <div className="w-28 h-28 bg-surface-bright border-4 border-secondary p-1 relative shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-4 flex items-center justify-center bg-notebook">
                  <AvatarRenderer 
                    avatarUrl={selectedAvatarId} 
                    size={96} 
                    className="w-full h-full object-contain" 
                  />
                  <span className="absolute bottom-0 right-0 bg-secondary text-[8px] px-1.5 py-0.5 text-on-secondary-fixed font-bold font-mono uppercase">
                    {activeAvatarName.split(" ")[0]}
                  </span>
                </div>

                {/* Avatar selector - only enabled or useful in Sign-Up mode to create custom avatar */}
                <div className="flex flex-col items-center w-full max-w-xs space-y-2">
                  <div className="grid grid-cols-5 gap-2 w-full">
                    {PRESET_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          setSelectedAvatarId(av.id);
                          setErrorMessage(null);
                        }}
                        className={`aspect-square border-2 bg-surface-bright p-1 flex items-center justify-center cursor-pointer transition-all ${
                          selectedAvatarId === av.id 
                            ? 'border-secondary scale-110 shadow-[2px_2px_0_0_#000] bg-secondary/15' 
                            : 'border-outline hover:border-secondary/60'
                        }`}
                        title={av.name}
                      >
                        <AvatarRenderer avatarUrl={av.id} size={36} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-on-surface-variant font-mono mt-3 text-center">
                    {activeSubTab === "login" 
                      ? "로그인 시 저장된 귀여운 프로필로 자동 연동됩니다." 
                      : "가입할 때 원하는 캐릭터를 골라보세요! (뽀송&화사)"}
                  </span>
                </div>
              </div>

              {/* Right Side: Input Form Fields */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <span className="font-label-sm text-[10px] text-secondary font-mono font-bold uppercase block">
                    {activeSubTab === "login" ? "[2] USER AUTHENTICATION KEY" : "[2] CREATE RETRO ACCOUNT CREDS"}
                  </span>

                  {/* Feedback Alerts */}
                  {errorMessage && (
                    <div className="bg-error-container border-2 border-error p-3.5 flex items-center gap-2.5 text-on-error-container text-xs font-bold font-mono">
                      <AlertCircle size={16} className="shrink-0 text-error" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="bg-primary/20 border-2 border-primary p-3.5 flex items-center gap-2.5 text-primary text-xs font-bold font-mono">
                      <CheckCircle size={16} className="shrink-0 text-primary" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Username input */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase font-mono">
                        {activeSubTab === "login" ? "Stylist ID (로그인 유저네임)" : "Desired Stylist ID (신규 유저네임)"}
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                        <input
                          type="text"
                          placeholder={activeSubTab === "login" ? "예: cyberstar (또는 가입한 ID)" : "예: CutiePuppy"}
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          className="w-full bg-surface-container-highest border-2 border-outline-variant focus:border-secondary focus:outline-none p-2.5 pl-9 font-mono text-sm text-on-surface uppercase placeholder-outline-variant shadow-[inset_1px_1px_3px_rgba(0,0,0,0.2)]"
                        />
                      </div>
                      {activeSubTab === "login" && (
                        <div className="text-[10px] text-outline font-mono">
                          * 기본 목업 계정: <span className="text-secondary">cyberstar</span>, <span className="text-secondary">pinkybear</span>, <span className="text-secondary">fairyangel</span> (비번: 1234)
                        </div>
                      )}
                    </div>

                    {/* Password input */}
                    <div className={activeSubTab === "login" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase font-mono">
                        Secure Key (비밀번호)
                      </label>
                      <div className="relative">
                        <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="w-full bg-surface-container-highest border-2 border-outline-variant focus:border-secondary focus:outline-none p-2.5 pl-9 pr-10 font-mono text-sm text-on-surface placeholder-outline-variant shadow-[inset_1px_1px_3px_rgba(0,0,0,0.2)]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-outline cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password (only for sign up) */}
                    {activeSubTab === "signup" && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-on-surface-variant uppercase font-mono">
                          Confirm Secure Key (비밀번호 확인)
                        </label>
                        <div className="relative">
                          <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••"
                            value={confirmPasswordInput}
                            onChange={(e) => setConfirmPasswordInput(e.target.value)}
                            className="w-full bg-surface-container-highest border-2 border-outline-variant focus:border-secondary focus:outline-none p-2.5 pl-9 pr-10 font-mono text-sm text-on-surface placeholder-outline-variant shadow-[inset_1px_1px_3px_rgba(0,0,0,0.2)]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Action triggers */}
                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-secondary text-on-secondary-fixed border-2 border-on-secondary-fixed hover:bg-opacity-90 font-bold uppercase tracking-wider text-xs p-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  >
                    <Sparkles size={14} />
                    <span>
                      {activeSubTab === "login" ? "SECURE LOGIN (로그인 완료)" : "CREATE PROFILE ACCOUNT (회원가입)"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateToHome}
                    className="bg-surface-container border-2 border-outline hover:border-outline-variant text-on-surface font-bold uppercase text-xs p-3.5 cursor-pointer transition-all shadow-[2px_2px_0_0_#000] flex items-center justify-center gap-1.5"
                  >
                    <span>비회원 게스트로 계속하기</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Already Logged In Panel - Diagnostic details */
            <div className="py-6 flex flex-col space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-surface-container-lowest border-2 border-outline-variant p-4">
                <div className="w-16 h-16 bg-primary/10 border-2 border-primary p-1 flex items-center justify-center rounded-none shadow-[2px_2px_0_0_rgba(0,0,0,0.1)] bg-notebook">
                  <AvatarRenderer avatarUrl={selectedAvatarId} size={48} />
                </div>
                <div className="text-center sm:text-left">
                  <h4 className="font-headline-md text-base text-primary uppercase font-bold flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span>접속 인가 완료: {usernameInput}</span>
                    <span className="text-[10px] font-mono bg-primary text-on-primary px-1.5 py-0.5 animate-pulse">SECURE</span>
                  </h4>
                  <p className="font-body-md text-xs text-on-surface-variant mt-1 font-mono">
                    귀여운 파스텔 스타일리스트 네트워크에 연동되었습니다. 환영합니다!
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onNavigateToHome}
                  className="bg-surface-container border-2 border-outline text-on-surface font-bold text-xs px-5 py-2.5 hover:bg-surface-container-high cursor-pointer transition-all shadow-[2px_2px_0_0_#000] flex items-center gap-1.5"
                >
                  <span>스타일 룸 대시보드 들어가기</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="bg-error-container border-2 border-error text-on-error-container font-bold text-xs px-5 py-2.5 hover:bg-opacity-90 flex items-center gap-1.5 cursor-pointer transition-all shadow-[2px_2px_0_0_#000]"
                >
                  <LogOut size={12} />
                  <span>로그아웃 (LOGOUT)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
