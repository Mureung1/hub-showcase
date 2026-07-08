import { useState, useRef, useEffect } from "react";
import {
  Flame, Snowflake, Zap, Copy, RefreshCw, Download,
  Sparkles, ChevronDown, Wind, Image as ImageIcon,
  Instagram, Clock, Hash, CloudRain, Sun, Cloud,
  Check, Plus, Trash2, MoreHorizontal, Bell, Settings,
  PenLine, History, ChevronRight, X, Loader2,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

function getTempColor(t: number) {
  if (t <= 30) return "#4FC3F7";
  if (t >= 80) return "#FF4D1F";
  return "#FFB020";
}
function getTempLabel(t: number) {
  if (t <= 30) return "감성 일기체";
  if (t >= 80) return "매운맛 풍자";
  return "균형 잡힌 유머";
}
function TempIcon({ t, size = 12 }: { t: number; size?: number }) {
  if (t <= 30) return <Snowflake size={size} />;
  if (t >= 80) return <Flame size={size} />;
  return <Zap size={size} />;
}

// ── static data ───────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "instagram", label: "인스타그램", icon: "📸" },
  { id: "kakao", label: "카카오스토리", icon: "💛" },
  { id: "blog", label: "블로그", icon: "✍️" },
  { id: "thread", label: "스레드", icon: "🧵" },
];

const CONTEXT_CHIPS = [
  { id: "weather", label: "날씨 반영", icon: <CloudRain size={11} /> },
  { id: "holiday", label: "공휴일 감지", icon: <Clock size={11} /> },
  { id: "trend", label: "트렌드 키워드", icon: <Hash size={11} /> },
  { id: "time", label: "시간대 감지", icon: <Sun size={11} /> },
];

const WEATHER_NOW = { icon: <CloudRain size={14} />, label: "흐리고 비", temp: "18°C" };

const HISTORY: { id: number; preview: string; temp: number; time: string }[] = [
  { id: 1, preview: "비가 억수로 쏟아지는데 주문 제로 실화냐구요 ㅋㅋ...", temp: 85, time: "오늘 11:20" },
  { id: 2, preview: "30분간 정성을 다해 완성한 음식이 돌아올 때의 그 감정...", temp: 22, time: "오늘 09:45" },
  { id: 3, preview: "배달 수수료 계산하다가 잠깐 멍했습니다 재료비+인건비+...", temp: 76, time: "어제 18:33" },
];

const EXAMPLE_RESULTS: Record<number, { cold: string; hot: string }> = {
  0: {
    cold:
      "비 내리는 오후, 텅 빈 홀을 바라보며 조용히 앉아있습니다.\n\n준비한 재료들이 저를 말없이 바라보는 것 같아 마음이 먹먹해지네요. 오늘 하루는 내일을 위해 숨 고르는 시간으로 삼아야겠습니다. 🌧️\n\n그래도 오셨다면, 따뜻하게 맞이할 준비는 되어 있습니다.",
    hot:
      "비가 억수로 쏟아지는데 주문 제로 실화냐구요 ㅋㅋㅋ\n\n저희 재료들이 저한테 '사장님... 우리 이제 어떡해요?' 하고 쳐다보는 눈빛 ㅠㅠ 아니 근데 비 오는 날엔 따끈한 거 더 먹어야 하지 않나요??\n\n오세요~ 비 뚫고 오시면 서비스 드립니다 ☔🔥",
  },
};

// ── main component ────────────────────────────────────────────────────────────

export default function App() {
  const [complaint, setComplaint] = useState("");
  const [temperature, setTemperature] = useState(80);
  const [platform, setPlatform] = useState("instagram");
  const [activeContext, setActiveContext] = useState<string[]>(["weather", "holiday"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultTemp, setResultTemp] = useState(80);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<number | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [imageGenerated, setImageGenerated] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const tempColor = getTempColor(temperature);
  const tempLabel = getTempLabel(temperature);

  const toggleContext = (id: string) => {
    setActiveContext((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComplaint(e.target.value);
    setCharCount(e.target.value.length);
    if (result) setResult(null);
  };

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

  const handleGenerateImage = () => {
    setIsGeneratingImage(true);
    setTimeout(() => {
      setIsGeneratingImage(false);
      setImageGenerated(true);
    }, 2200);
  };

  const handleHistorySelect = (item: (typeof HISTORY)[0]) => {
    setSelectedHistory(item.id);
    setResult(item.preview + "\n\n(이전 생성 콘텐츠)");
    setResultTemp(item.temp);
    setShowHistory(false);
  };

  // auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [complaint]);

  const resultColor = getTempColor(resultTemp);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground font-sans overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="h-14 shrink-0 border-b border-border flex items-center px-5 gap-4 bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-2 mr-4">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--primary)" }}
          >
            <Flame size={13} className="text-white" />
          </div>
          <span className="font-display font-bold text-base tracking-tight">
            하소AI
          </span>
        </div>

        {/* breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>새 콘텐츠 만들기</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* weather pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground">
            {WEATHER_NOW.icon}
            <span>{WEATHER_NOW.label}</span>
            <span className="font-mono">{WEATHER_NOW.temp}</span>
          </div>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-lg border transition-colors ${
              showHistory ? "border-[var(--primary)] bg-[rgba(255,77,31,0.08)]" : "border-border hover:bg-muted"
            }`}
          >
            <History size={15} className={showHistory ? "text-[var(--primary)]" : ""} />
          </button>

          <button className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
            <Bell size={15} />
          </button>

          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold ml-1">
            김
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* History drawer */}
        {showHistory && (
          <aside className="w-72 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                생성 히스토리
              </span>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X size={13} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {HISTORY.map((h) => {
                const hColor = getTempColor(h.temp);
                return (
                  <button
                    key={h.id}
                    onClick={() => handleHistorySelect(h)}
                    className="text-left p-3 rounded-xl border border-border hover:border-[rgba(255,255,255,0.14)] hover:bg-background transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-mono"
                        style={{ background: `${hColor}15`, color: hColor }}
                      >
                        <TempIcon t={h.temp} size={9} />
                        {h.temp}°
                      </div>
                      <span className="text-xs text-muted-foreground">{h.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {h.preview}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-border">
              <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border border-border hover:bg-muted transition-colors text-muted-foreground">
                <Plus size={11} /> 새로 만들기
              </button>
            </div>
          </aside>
        )}

        {/* ── Left panel: INPUT ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-border">
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

            {/* Complaint input */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  오늘의 하소연
                </label>
                <span className="text-xs font-mono text-muted-foreground">
                  {charCount} / 500
                </span>
              </div>
              <div className="relative bg-card border border-border rounded-xl overflow-hidden focus-within:border-[rgba(255,77,31,0.45)] transition-colors">
                <textarea
                  ref={textareaRef}
                  value={complaint}
                  onChange={handleInput}
                  placeholder="오늘 있었던 일을 그냥 편하게 적어주세요.&#10;&#10;예) 손님이 주문하고 30분 후 환불 요청을 했어요. 이미 다 만들었는데 진짜..."
                  maxLength={500}
                  className="w-full bg-transparent px-4 pt-4 pb-3 text-sm leading-relaxed resize-none outline-none placeholder:text-muted-foreground/50 min-h-[120px]"
                  style={{ scrollbarWidth: "none" }}
                />
                {complaint && (
                  <button
                    onClick={() => { setComplaint(""); setCharCount(0); setResult(null); }}
                    className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
                <div className="px-4 pb-3 flex items-center gap-2">
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    <PenLine size={11} /> 예시 불러오기
                  </button>
                </div>
              </div>
            </div>

            {/* Platform */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                발행 채널
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs transition-all ${
                      platform === p.id
                        ? "text-foreground"
                        : "border-border text-muted-foreground hover:border-[rgba(255,255,255,0.14)]"
                    }`}
                    style={
                      platform === p.id
                        ? { borderColor: "var(--primary)", background: "rgba(255,77,31,0.07)" }
                        : {}
                    }
                  >
                    <span className="text-base">{p.icon}</span>
                    <span className="leading-none">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Context engine */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  맥락 엔진
                </label>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wind size={11} />
                  <span>자동 감지 중</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "#34D399" }}
                  />
                </div>
              </div>

              {/* context live info */}
              <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CloudRain size={12} />
                  <span>흐리고 비, 18°C</span>
                </div>
                <div className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock size={12} />
                  <span>화요일 오후</span>
                </div>
                <div className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Hash size={12} />
                  <span>#혼밥 #소확행</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {CONTEXT_CHIPS.map((c) => {
                  const on = activeContext.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleContext(c.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all ${
                        on
                          ? "text-foreground"
                          : "border-border text-muted-foreground hover:border-[rgba(255,255,255,0.14)]"
                      }`}
                      style={
                        on
                          ? { borderColor: "rgba(255,176,32,0.5)", background: "rgba(255,176,32,0.1)", color: "#FFB020" }
                          : {}
                      }
                    >
                      {c.icon} {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Temperature */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  감정 온도
                </label>
                <div
                  className="flex items-center gap-1.5 font-mono font-bold text-sm transition-colors duration-200"
                  style={{ color: tempColor }}
                >
                  <TempIcon t={temperature} size={13} />
                  {temperature}°
                  <span
                    className="text-xs font-sans font-normal px-2 py-0.5 rounded-full ml-1 transition-all duration-200"
                    style={{
                      background: `${tempColor}15`,
                      color: tempColor,
                      border: `1px solid ${tempColor}30`,
                    }}
                  >
                    {tempLabel}
                  </span>
                </div>
              </div>

              {/* temp track with gradient */}
              <div className="relative">
                <div
                  className="h-1.5 w-full rounded-full mb-3"
                  style={{
                    background:
                      "linear-gradient(to right, #4FC3F7 0%, #FFB020 55%, #FF4D1F 100%)",
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={temperature}
                  onChange={(e) => {
                    setTemperature(Number(e.target.value));
                    if (result) setResult(null);
                  }}
                  className="absolute top-0 w-full opacity-0 cursor-pointer h-1.5"
                  style={{ accentColor: tempColor }}
                />
                {/* thumb indicator */}
                <div
                  className="absolute -top-0.5 w-4 h-4 rounded-full border-2 border-background shadow-lg transition-colors duration-200 pointer-events-none"
                  style={{
                    left: `calc(${temperature}% - 8px)`,
                    background: tempColor,
                  }}
                />
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Snowflake size={10} style={{ color: "#4FC3F7" }} /> 0° 잔잔
                </span>
                <span className="flex items-center gap-1">
                  50° 균형 <Zap size={10} style={{ color: "#FFB020" }} />
                </span>
                <span className="flex items-center gap-1">
                  100° 매운맛 <Flame size={10} style={{ color: "#FF4D1F" }} />
                </span>
              </div>

              {/* tone preview pills */}
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[
                  { range: "0–30°", label: "감성 일기", color: "#4FC3F7", active: temperature <= 30 },
                  { range: "31–79°", label: "균형 유머", color: "#FFB020", active: temperature > 30 && temperature < 80 },
                  { range: "80–100°", label: "매운 풍자", color: "#FF4D1F", active: temperature >= 80 },
                ].map((tone) => (
                  <div
                    key={tone.range}
                    className="py-2 px-3 rounded-lg border text-center transition-all"
                    style={{
                      borderColor: tone.active ? `${tone.color}50` : "var(--border)",
                      background: tone.active ? `${tone.color}10` : "transparent",
                    }}
                  >
                    <div
                      className="text-xs font-mono mb-0.5"
                      style={{ color: tone.active ? tone.color : "var(--muted-foreground)" }}
                    >
                      {tone.range}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: tone.active ? tone.color : "var(--muted-foreground)" }}
                    >
                      {tone.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <div className="shrink-0 p-4 border-t border-border bg-card/40">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!complaint.trim() && selectedHistory === null)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isGenerating
                  ? "var(--muted)"
                  : "var(--primary)",
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  콘텐츠 생성 중...
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  콘텐츠 생성하기
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Right panel: OUTPUT ────────────────────────────────────────────── */}
        <div className="w-[52%] shrink-0 flex flex-col overflow-hidden bg-background">

          {/* output header */}
          <div className="h-11 shrink-0 border-b border-border flex items-center justify-between px-5">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              생성된 콘텐츠
            </span>
            {result && (
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-mono"
                  style={{
                    background: `${resultColor}15`,
                    color: resultColor,
                    border: `1px solid ${resultColor}30`,
                  }}
                >
                  <TempIcon t={resultTemp} size={9} />
                  {resultTemp}° · {getTempLabel(resultTemp)}
                </div>
                <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <MoreHorizontal size={14} className="text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

            {/* empty / loading state */}
            {!result && !isGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center">
                  <Sparkles size={24} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">아직 생성된 콘텐츠가 없어요</p>
                  <p className="text-xs text-muted-foreground">
                    왼쪽에 하소연을 입력하고 생성 버튼을 누르세요
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 max-w-xs w-full mt-2">
                  {[
                    "비 오는 날 주문 없음 😭",
                    "환불 요청 속상해요",
                    "수수료가 너무 높아요",
                    "진상 손님 등장...",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setComplaint(q);
                        setCharCount(q.length);
                      }}
                      className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[rgba(255,255,255,0.14)] transition-all text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 py-16">
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        background: tempColor,
                        animationDelay: `${i * 0.12}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">AI가 콘텐츠를 쓰고 있어요</p>
                  <p className="text-xs text-muted-foreground">
                    날씨·요일 맥락을 반영하는 중...
                  </p>
                </div>
              </div>
            )}

            {result && !isGenerating && (
              <>
                {/* Platform preview card */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  {/* mock platform header */}
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: "var(--primary)" }}
                    >
                      사
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none mb-0.5">
                        우리동네 맛집
                      </p>
                      <p className="text-xs text-muted-foreground">방금 전</p>
                    </div>
                    <div className="text-lg">
                      {PLATFORMS.find((p) => p.id === platform)?.icon}
                    </div>
                  </div>

                  {/* content text */}
                  <div className="px-4 py-4">
                    <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {result}
                    </pre>
                  </div>

                  {/* mock engagement */}
                  <div className="px-4 py-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                    <span>❤️ 247</span>
                    <span>💬 38</span>
                    <span>🔗 12</span>
                    <span className="ml-auto">
                      {result.length}자
                    </span>
                  </div>
                </div>

                {/* action bar */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-xs hover:bg-card transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check size={12} style={{ color: "#34D399" }} />
                        <span style={{ color: "#34D399" }}>복사됨!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        복사하기
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-xs hover:bg-card transition-colors"
                  >
                    <RefreshCw size={12} />
                    다시 생성
                  </button>
                  <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-xs hover:bg-card transition-colors">
                    <Download size={12} />
                    저장하기
                  </button>
                </div>

                {/* AI image section */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      AI 이미지 생성
                    </div>
                    <span className="text-xs text-muted-foreground">
                      DALL·E 3
                    </span>
                  </div>

                  {!imageGenerated && !isGeneratingImage && (
                    <button
                      onClick={handleGenerateImage}
                      className="flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-border hover:border-[rgba(255,176,32,0.4)] hover:bg-[rgba(255,176,32,0.04)] transition-all text-sm text-muted-foreground group"
                    >
                      <ImageIcon
                        size={16}
                        className="group-hover:text-[#FFB020] transition-colors"
                      />
                      <span className="group-hover:text-foreground transition-colors">
                        이 하소연을 이미지로 시각화하기
                      </span>
                    </button>
                  )}

                  {isGeneratingImage && (
                    <div className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-dashed border-border">
                      <Loader2
                        size={20}
                        className="animate-spin"
                        style={{ color: "#FFB020" }}
                      />
                      <p className="text-xs text-muted-foreground">
                        이미지를 생성하는 중...
                      </p>
                    </div>
                  )}

                  {imageGenerated && (
                    <div className="relative rounded-xl overflow-hidden border border-border bg-card aspect-square max-h-64">
                      {/* placeholder gradient image */}
                      <div
                        className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-6"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(255,77,31,0.15) 0%, rgba(255,176,32,0.08) 50%, rgba(79,195,247,0.12) 100%)",
                        }}
                      >
                        <div className="text-5xl">☔</div>
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-[180px]">
                          비 오는 날, 텅 빈 홀의 창밖을 바라보는 사장님
                        </p>
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        <button className="p-1.5 rounded-lg bg-background/70 backdrop-blur-sm border border-border hover:bg-background transition-colors">
                          <Download size={12} />
                        </button>
                        <button
                          onClick={() => setImageGenerated(false)}
                          className="p-1.5 rounded-lg bg-background/70 backdrop-blur-sm border border-border hover:bg-background transition-colors"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* hashtag suggestions */}
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    추천 해시태그
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "#소상공인",
                      "#사장님일기",
                      "#맛집",
                      "#비오는날",
                      "#하소연",
                      "#솔직함이마케팅",
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[rgba(255,255,255,0.14)] cursor-pointer transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
