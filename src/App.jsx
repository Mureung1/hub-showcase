import { useState, useRef, useEffect } from "react";
import { Header } from "./components/Header";
import { HistoryPanel } from "./components/HistoryPanel";
import { ComplaintInput } from "./components/ComplaintInput";
import { PlatformSelector } from "./components/PlatformSelector";
import { ContextEngine } from "./components/ContextEngine";
import { TemperatureSlider } from "./components/TemperatureSlider";
import { GenerateButton } from "./components/GenerateButton";
import { ResultPanel } from "./components/ResultPanel";
import { HISTORY, EXAMPLE_RESULTS } from "./data/mockData";

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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // 히스토리 관련 상태
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);

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

  // TODO: 실제 GPT-4o API 연동 지점. 지금은 setTimeout으로 흉내만 냄.
  const handleGenerate = () => {
    if (!complaint.trim() && selectedHistory === null) return;
    setIsGenerating(true);
    setResult(null);
    setImageGenerated(false);
    setResultTemp(temperature);

    setTimeout(() => {
      const base = EXAMPLE_RESULTS[0];
      const generated =
        temperature <= 30
          ? base.cold
          : temperature >= 80
          ? base.hot
          : `${base.cold.split("\n\n")[0]}\n\n${base.hot.split("\n\n").slice(-1)[0]}`;
      setResult(generated);
      setIsGenerating(false);
    }, 1800);
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // TODO: 실제 GPT Image 1.5 API 연동 지점. 지금은 setTimeout으로 흉내만 냄.
  const handleGenerateImage = () => {
    setIsGeneratingImage(true);
    setTimeout(() => {
      setIsGeneratingImage(false);
      setImageGenerated(true);
    }, 2200);
  };

  const handleHistorySelect = (item) => {
    setSelectedHistory(item.id);
    setResult(item.preview + "\n\n(이전 생성 콘텐츠)");
    setResultTemp(item.temp);
    setShowHistory(false);
  };

  // 하소연 입력창 자동 높이 조절
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [complaint]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground font-sans overflow-hidden">
      <Header showHistory={showHistory} onToggleHistory={() => setShowHistory((v) => !v)} />

      <div className="flex-1 flex overflow-hidden relative">
        {showHistory && (
          <HistoryPanel items={HISTORY} onSelect={handleHistorySelect} onClose={() => setShowHistory(false)} />
        )}

        {/* 왼쪽: 입력 패널 */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-border">
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            <ComplaintInput
              value={complaint}
              charCount={charCount}
              textareaRef={textareaRef}
              onChange={handleInput}
              onClear={handleClearComplaint}
            />
            <PlatformSelector selected={platform} onSelect={setPlatform} />
            <ContextEngine active={activeContext} onToggle={toggleContext} />
            <TemperatureSlider value={temperature} onChange={handleTemperatureChange} />
          </div>

          <GenerateButton
            isGenerating={isGenerating}
            disabled={isGenerating || (!complaint.trim() && selectedHistory === null)}
            onClick={handleGenerate}
          />
        </div>

        {/* 오른쪽: 결과 패널 */}
        <ResultPanel
          result={result}
          isGenerating={isGenerating}
          resultTemp={resultTemp}
          platform={platform}
          copied={copied}
          imageGenerated={imageGenerated}
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
