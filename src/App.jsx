import { useState, useRef, useEffect } from "react";
import { Header } from "./components/Header";
import { HistoryPanel } from "./components/HistoryPanel";
import { ComplaintInput } from "./components/ComplaintInput";
import { PlatformSelector } from "./components/PlatformSelector";
import { ContextEngine } from "./components/ContextEngine";
import { TemperatureSlider } from "./components/TemperatureSlider";
import { GenerateButton } from "./components/GenerateButton";
import { ResultPanel } from "./components/ResultPanel";
import { BusinessProfileModal } from "./components/BusinessProfileModal";
import { HISTORY, PLATFORM_CHAR_LIMITS } from "./data/mockData";
import { loadBusinessProfile, saveBusinessProfile } from "./utils/businessProfile";

// 백엔드 주소. 로컬 개발 기준. 배포 시 실제 서버 주소로 바꿔야 함.
const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  // 입력 관련 상태
  const [complaint, setComplaint] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [platform, setPlatform] = useState("instagram");
  const [temperature, setTemperature] = useState(80);
  const [activeContext, setActiveContext] = useState(["weather", "holiday", "keyword"]);

  // 생성 결과 관련 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [resultTemp, setResultTemp] = useState(80);
  const [copied, setCopied] = useState(false);
  const [imageGenerated, setImageGenerated] = useState(false);
  const [imageCaption, setImageCaption] = useState("");
  const [imageBase64, setImageBase64] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // 온도 자동 제안 관련 상태
  const [suggestReason, setSuggestReason] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);

  // 히스토리 관련 상태
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);

  // 맥락 엔진(날씨/공휴일) 관련 상태 - 앱 켜질 때 한 번 조회해서 화면에도 보여주고,
  // 콘텐츠 생성 시에도 재사용 (매번 새로 요청 안 함)
  const [weatherText, setWeatherText] = useState("");
  const [holidayText, setHolidayText] = useState("");
  const [isLoadingContext, setIsLoadingContext] = useState(true);

  useEffect(() => {
    async function loadContext() {
      setIsLoadingContext(true);
      const [weatherRes, holidayRes] = await Promise.allSettled([
        fetch(`${API_BASE}/weather`).then((r) => r.json()),
        fetch(`${API_BASE}/holiday`).then((r) => r.json()),
      ]);

      if (weatherRes.status === "fulfilled" && weatherRes.value.temp) {
        setWeatherText(`${weatherRes.value.label}, ${weatherRes.value.temp}`);
      } else {
        setWeatherText("");
      }

      if (holidayRes.status === "fulfilled" && holidayRes.value.is_special_day) {
        setHolidayText(holidayRes.value.name);
      } else {
        setHolidayText("");
      }

      setIsLoadingContext(false);
    }
    loadContext();
  }, []);

  // 업장 프로필 관련 상태 (localStorage에 저장, 매 생성마다 재사용)
  const [businessProfile, setBusinessProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const saved = loadBusinessProfile();
    setBusinessProfile(saved);
    if (!saved) setShowProfileModal(true);
  }, []);

  const handleSaveProfile = (profile) => {
    saveBusinessProfile(profile);
    setBusinessProfile(profile);
    setShowProfileModal(false);
  };

  const textareaRef = useRef(null);

  const toggleContext = (id) => {
    setActiveContext((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleInput = (e) => {
    setComplaint(e.target.value);
    setCharCount(e.target.value.length);
    if (result) setResult(null);
  };

  const handleClearComplaint = () => {
    setComplaint("");
    setCharCount(0);
    setResult(null);
  };

  const handlePickExample = (text) => {
    setComplaint(text);
    setCharCount(text.length);
  };

  const handleTemperatureChange = (value) => {
    setTemperature(value);
    if (result) setResult(null);
  };

  // 플랫폼이 바뀌어서 글자수 제한이 줄어들면, 초과분은 잘라줌
  useEffect(() => {
    const limit = PLATFORM_CHAR_LIMITS[platform] || 500;
    if (complaint.length > limit) {
      const trimmed = complaint.slice(0, limit);
      setComplaint(trimmed);
      setCharCount(trimmed.length);
    }
  }, [platform]);

  // 하소연 내용을 분석해서 어울리는 온도를 AI가 1차 제안 (반복 회피 로직 포함)
  const handleSuggestTemperature = async () => {
    if (!complaint.trim()) return;
    setIsSuggesting(true);
    try {
      const res = await fetch(`${API_BASE}/suggest-temperature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaint }),
      });
      if (!res.ok) throw new Error(`서버 응답 오류 (${res.status})`);
      const data = await res.json();
      setTemperature(data.suggested_temperature);
      setSuggestReason(data.reason || "");
      if (result) setResult(null);
    } catch (err) {
      console.error("온도 제안 실패:", err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleGenerate = async () => {
    if (!complaint.trim() && selectedHistory === null) return;
    setIsGenerating(true);
    setResult(null);
    setImageGenerated(false);
    setResultTemp(temperature);

    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint,
          temperature,
          platform,
          weather: weatherText || null,
          holiday: holidayText || null,
          business_name: businessProfile?.name || null,
          business_type: businessProfile?.type || null,
          business_description: businessProfile?.description || null,
        }),
      });

      if (!res.ok) throw new Error(`서버 응답 오류 (${res.status})`);

      const data = await res.json();
      setResult(data.result);
    } catch (err) {
      console.error("콘텐츠 생성 실패:", err);
      setResult("콘텐츠를 생성하지 못했어요. 백엔드 서버가 켜져 있는지 확인해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  // GPT Image 1.5 연동. 백엔드가 base64 이미지 데이터를 반환함.
  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    try {
      const res = await fetch(`${API_BASE}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaint }),
      });

      if (!res.ok) throw new Error(`서버 응답 오류 (${res.status})`);

      const data = await res.json();
      setImageBase64(data.image_base64 || null);
      setImageCaption(data.caption || "");
      setImageGenerated(true);
    } catch (err) {
      console.error("이미지 생성 실패:", err);
      setImageBase64(null);
      setImageCaption("이미지를 생성하지 못했어요.");
      setImageGenerated(true);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHistorySelect = (item) => {
    setSelectedHistory(item.id);
    setResult(item.preview + "\n\n(이전 생성 콘텐츠)");
    setResultTemp(item.temp);
    setShowHistory(false);
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [complaint]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground font-sans overflow-hidden">
      <Header
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory((v) => !v)}
        businessProfile={businessProfile}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      {showProfileModal && (
        <BusinessProfileModal
          initialProfile={businessProfile}
          onSave={handleSaveProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {showHistory && (
          <HistoryPanel items={HISTORY} onSelect={handleHistorySelect} onClose={() => setShowHistory(false)} />
        )}

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-border">
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            <ComplaintInput
              value={complaint}
              charCount={charCount}
              maxLength={PLATFORM_CHAR_LIMITS[platform] || 500}
              textareaRef={textareaRef}
              onChange={handleInput}
              onClear={handleClearComplaint}
            />
            <PlatformSelector selected={platform} onSelect={setPlatform} />
            <ContextEngine
              active={activeContext}
              onToggle={toggleContext}
              weatherInfo={weatherText}
              holidayInfo={holidayText}
              isLoadingContext={isLoadingContext}
            />
            <TemperatureSlider
              value={temperature}
              onChange={handleTemperatureChange}
              onSuggest={handleSuggestTemperature}
              isSuggesting={isSuggesting}
              suggestReason={suggestReason}
            />
          </div>

          <GenerateButton
            isGenerating={isGenerating}
            disabled={isGenerating || (!complaint.trim() && selectedHistory === null)}
            onClick={handleGenerate}
          />
        </div>

        <ResultPanel
          result={result}
          isGenerating={isGenerating}
          resultTemp={resultTemp}
          platform={platform}
          copied={copied}
          imageGenerated={imageGenerated}
          imageCaption={imageCaption}
          imageBase64={imageBase64}
          isGeneratingImage={isGeneratingImage}
          onPickExample={handlePickExample}
          onCopy={handleCopy}
          onRegenerate={handleGenerate}
          onGenerateImage={handleGenerateImage}
          onResetImage={() => setImageGenerated(false)}
        />
      </div>
    </div>
  );
}
