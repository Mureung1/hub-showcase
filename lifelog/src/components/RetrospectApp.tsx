import { useState, useRef, useEffect } from "react";
import { Home, CalendarClock, CircleUser, Upload } from "lucide-react";

const API_BASE = "http://localhost:3000";

// 베이지 배경(#F3EEE4)과 겹치지 않는 파스텔 팔레트
// bg: 카드 전체 배경 / iconBg: 아이콘 원(칩 테두리) / text: 텍스트·화살표 색
const PASTEL_PALETTE = [
  { bg: "#FBE9E7", iconBg: "#F5CFC9", text: "#C4626B" }, // 핑크
  { bg: "#E4EFE1", iconBg: "#D3E8CC", text: "#4C8A47" }, // 그린
  { bg: "#E3ECFB", iconBg: "#C9DBF7", text: "#4A6FA5" }, // 블루
  { bg: "#F1E7FB", iconBg: "#E3CEF5", text: "#8659B5" }, // 퍼플
  { bg: "#FBF3D9", iconBg: "#F5E3B8", text: "#A9821A" }, // 옐로우
  { bg: "#FBE4F0", iconBg: "#F5CFE3", text: "#B5568E" }, // 로즈
  { bg: "#E1F5F0", iconBg: "#C7EAE0", text: "#2E8874" }, // 틸
  { bg: "#FDEAD9", iconBg: "#F8D3B0", text: "#C97A3D" }, // 피치
];

function getPastelColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PASTEL_PALETTE.length;
  return PASTEL_PALETTE[index];
}
function getDistinctColors(names) {
  return names.map((_, i) => PASTEL_PALETTE[i % PASTEL_PALETTE.length]);
}

// 날짜 문자열(YYYY-MM-DD)을 "오늘/N일 전/N주 전/N개월 전"으로 변환
function formatRelativeDate(dateStr) {
  if (!dateStr) return "";
  const target = new Date(dateStr);
  const today = new Date();
  const diffMs = today.setHours(0, 0, 0, 0) - target.setHours(0, 0, 0, 0);
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "오늘";
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return `${Math.floor(diffDays / 30)}개월 전`;
}

// weekStart(YYYY-MM-DD) 기준으로 "N월 M주차" 라벨 계산
function formatWeekSub(weekStartStr) {
  const d = new Date(weekStartStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekNum = Math.ceil(day / 7);
  return `${month}월 ${weekNum}주차`;
}

// weekStart~weekEnd(YYYY-MM-DD)를 "M.D~M.D" 형태로 변환
function formatWeekDate(weekStartStr, weekEndStr) {
  const s = new Date(weekStartStr);
  const e = new Date(weekEndStr);
  return `${s.getMonth() + 1}.${s.getDate()}~${e.getMonth() + 1}.${e.getDate()}`;
}

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
.kw-chip{ transition: background-color .15s ease, transform .15s ease; cursor: pointer; }
.kw-chip:hover{ transform: translateY(-1px); }
.kw-chip-pink:hover{ background: #F6D2CE !important; }
.kw-chip-green:hover{ background: #CFE6D1 !important; }
.kw-chip-gray:hover{ background: #E8E4D9 !important; }
.arrow-btn{ transition: background-color .15s ease, color .15s ease; }
`;

// 월별 기록(월별 기록 모달)은 아직 monthly_records API가 없어서 더미 데이터 유지
const monthData = {
  m07: {
    title: "2026년 7월",
    worries: ["면접 준비와 자신감에 대한 불안", "운동을 꾸준히 못 하는 것에 대한 자책"],
    goals: ["면접 스터디 꾸준히 참여하기", "이력서 3곳 이상 제출하기", "주 3회 운동하기"],
    emotions: [{ e: "😌", n: "안정", p: "42%" }, { e: "😤", n: "답답함", p: "23%" }],
  },
  m06: {
    title: "2026년 6월",
    worries: ["이직을 해야 하는지에 대한 막막함", "지금 회사에 계속 다녀도 되는지"],
    goals: ["이직 시장 리서치 해보기", "이력서 초안 작성해두기"],
    emotions: [{ e: "😟", n: "불안", p: "47%" }, { e: "😴", n: "무기력", p: "21%" }],
  },
  m05: {
    title: "2026년 5월",
    worries: ["반복되는 야근에 대한 지침", "자기계발 시간이 없다는 답답함"],
    goals: ["퇴근 후 30분이라도 공부하기", "주말엔 아무것도 안 하고 쉬어보기"],
    emotions: [{ e: "😩", n: "지침", p: "39%" }, { e: "😐", n: "무감정", p: "27%" }],
  },
};

const EMO_STYLE = {
  안정: { color: "#BFDCC2", face: "calm" },
  답답함: { color: "#E2A2A2", face: "stress" },
  불안: { color: "#B7ACDE", face: "anxious" },
  무기력: { color: "#C9C7C2", face: "tired" },
  지침: { color: "#B9D1E6", face: "sleepy" },
  무감정: { color: "#E7C6CE", face: "numb" },
  당황: { color: "#E8DD8C", face: "flutter" },
  자각: { color: "#CDE0D9", face: "calm" },
  긴장: { color: "#AEB7DE", face: "anxious" },
};

function EmoBlob({ name, size = 40 }) {
  const style = EMO_STYLE[name] || { color: "#D8D3C8", face: "numb" };
  const faces = {
    calm: (
      <g stroke="#3A332C" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M35 46 Q40 40 45 46" />
        <path d="M55 46 Q60 40 65 46" />
        <path d="M42 58 Q50 64 58 58" />
      </g>
    ),
    stress: (
      <g stroke="#3A332C" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <line x1="36" y1="45" x2="46" y2="45" />
        <line x1="54" y1="45" x2="64" y2="45" />
        <line x1="41" y1="60" x2="59" y2="60" />
      </g>
    ),
    anxious: (
      <g stroke="#3A332C" strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M34 44 L46 47" />
        <path d="M66 44 L54 47" />
        <ellipse cx="40" cy="52" rx="2.2" ry="3" fill="#3A332C" stroke="none" />
        <ellipse cx="60" cy="52" rx="2.2" ry="3" fill="#3A332C" stroke="none" />
        <circle cx="50" cy="61" r="3" fill="none" />
      </g>
    ),
    tired: (
      <g stroke="#3A332C" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <line x1="35" y1="47" x2="45" y2="47" />
        <line x1="55" y1="47" x2="65" y2="47" />
        <path d="M43 61 Q50 57 57 61" />
      </g>
    ),
    sleepy: (
      <g stroke="#3A332C" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M34 46 Q40 50 46 46" />
        <path d="M54 46 Q60 50 66 46" />
        <line x1="46" y1="60" x2="54" y2="60" />
      </g>
    ),
    numb: (
      <g stroke="#3A332C" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <line x1="36" y1="47" x2="46" y2="47" />
        <line x1="54" y1="47" x2="64" y2="47" />
        <line x1="42" y1="60" x2="58" y2="60" />
      </g>
    ),
    flutter: (
      <g stroke="#3A332C" strokeWidth="2.2" fill="none">
        <circle cx="41" cy="47" r="3.4" fill="#3A332C" stroke="none" />
        <circle cx="59" cy="47" r="3.4" fill="#3A332C" stroke="none" />
        <circle cx="50" cy="60" r="3.4" strokeLinecap="round" />
      </g>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path
        d="M50,6 C70,4 92,20 94,45 C96,68 82,90 58,94 C35,98 10,86 6,62 C2,40 14,16 38,8 C42,6 46,6 50,6 Z"
        fill={style.color}
      />
      {faces[style.face]}
    </svg>
  );
}
function CatAvatar({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d="M76 68 Q94 66 90 50 Q88 43 79 46" stroke="#1E1E1E" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M27 38 L21 14 L42 30 Z" fill="#1E1E1E" />
      <path d="M64 30 L72 12 L79 36 Z" fill="#1E1E1E" />
      <ellipse cx="50" cy="60" rx="36" ry="30" fill="#1E1E1E" />
      <circle cx="38" cy="54" r="12" fill="#F5C842" />
      <circle cx="62" cy="54" r="12" fill="#F5C842" />
      <circle cx="38" cy="56" r="5.5" fill="#1E1E1E" />
      <circle cx="62" cy="56" r="5.5" fill="#1E1E1E" />
      <circle cx="35.5" cy="52" r="1.6" fill="#FFFFFF" />
      <circle cx="59.5" cy="52" r="1.6" fill="#FFFFFF" />
      <path d="M46 66 L54 66 L50 71 Z" fill="#E9A8A8" />
      <path d="M50 71 Q50 75 46 75" stroke="#3A332C" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M50 71 Q50 75 54 75" stroke="#3A332C" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <line x1="10" y1="62" x2="27" y2="60" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10" y1="70" x2="27" y2="68" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="90" y1="62" x2="73" y2="60" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="90" y1="70" x2="73" y2="68" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function RetrospectApp() {
  const [tab, setTab] = useState("home");
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [showOlder, setShowOlder] = useState(false);
  const scrollRef = useRef(null);
  const cardRefs = useRef({});
  const [highlightedCard, setHighlightedCard] = useState(null);

  // ===== API 연결: 키워드 목록 (홈 화면 칩) =====
  const [keywords, setKeywords] = useState([]);
  const [keywordsLoading, setKeywordsLoading] = useState(true);
  const [keywordsError, setKeywordsError] = useState(null);

  // ===== API 연결: 선택된 키워드의 타임라인 =====
  const [selectedKeywordId, setSelectedKeywordId] = useState(null);
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [timelinePeriods, setTimelinePeriods] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState(null);

  // 키워드 목록 불러오기 (홈 화면 마운트 시 + 업로드 완료 후 재사용)
  const fetchKeywords = async () => {
    try {
      setKeywordsLoading(true);
      const res = await fetch(`${API_BASE}/api/keywords`);
      const json = await res.json();
      if (json.success) {
        setKeywords(json.data);
        if (json.data.length > 0 && selectedKeywordId === null) {
          setSelectedKeywordId(json.data[0].id);
          setSelectedKeyword("#" + json.data[0].name);
        }
      } else {
        setKeywordsError(json.error || "키워드를 불러오지 못했어요.");
      }
    } catch (err) {
      setKeywordsError("서버에 연결하지 못했어요. (서버가 켜져 있는지 확인해주세요)");
    } finally {
      setKeywordsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  // 선택된 키워드가 바뀔 때마다 타임라인 불러오기
  useEffect(() => {
    if (selectedKeywordId === null) return;

    async function fetchTimeline() {
      try {
        setTimelineLoading(true);
        setTimelineError(null);
        const res = await fetch(`${API_BASE}/api/timeline/${selectedKeywordId}`);
        const json = await res.json();
        if (json.success) {
          const mapped = json.data.map((row) => ({
            id: row.weekStart,
            label: formatWeekSub(row.weekStart),
            sub: formatWeekSub(row.weekStart),
            date: formatWeekDate(row.weekStart, row.weekEnd),
            title: row.title,
            desc: row.description,
            focus: row.focusText,
            emo: [
              row.emotion1 ? { n: row.emotion1, p: `${row.emotion1Percent}%` } : null,
              row.emotion2 ? { n: row.emotion2, p: `${row.emotion2Percent}%` } : null,
            ].filter(Boolean),
          }));
          setTimelinePeriods(mapped);
          if (mapped.length > 0) setSelectedPeriod(mapped[mapped.length - 1].id);
        } else {
          setTimelineError(json.error || "타임라인을 불러오지 못했어요.");
        }
      } catch (err) {
        setTimelineError("서버에 연결하지 못했어요. (서버가 켜져 있는지 확인해주세요)");
      } finally {
        setTimelineLoading(false);
      }
    }
    fetchTimeline();
  }, [selectedKeywordId]);

  const jumpToCard = (id) => {
    setSelectedPeriod(id);
    const el = cardRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedCard(id);
      setTimeout(() => setHighlightedCard(null), 1400);
    }
  };
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleFileChange = async (evt) => {
      const file = evt.target.files && evt.target.files[0];
      if (!file) return;

      setUploadedFile(`${file.name} 분석 중이에요... (시간이 좀 걸릴 수 있어요)`);

      try {
        const text = await file.text();
        const conversations = JSON.parse(text);

        const response = await fetch(`${API_BASE}/api/upload-conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversations }),
        });
        const json = await response.json();

        if (json.success) {
          const { newConversations, savedCount, skippedCount } = json.data;
          if (newConversations === 0) {
            setUploadedFile("이미 다 처리된 대화들이에요.");
          } else {
            setUploadedFile(`${newConversations}개 대화에서 ${savedCount}개 저장, ${skippedCount}개는 정보성 질문이라 건너뛰었어요.`);
          }
          fetchKeywords(); // 홈 화면 키워드 목록 새로고침
        } else {
          setUploadedFile(`업로드 실패: ${json.error}`);
        }
      } catch (err) {
        setUploadedFile("파일을 처리하지 못했어요. JSON 형식을 확인해주세요.");
      }

      setTimeout(() => setUploadedFile(null), 6000);
    };

  const paper = "#F3EEE4";
  const ink = "#362F2A";
  const inkSoft = "#847A6E";
  const inkFaint = "#B7AEA0";
  const thread = "#5F7A5C";
  const threadSoft = "#DCE4D6";
  const orange = "#EFA24A";

  const fontFamily = "'Manrope','Noto Sans KR',sans-serif";

  return (
    <div className="min-h-screen w-full" style={{ background: paper, fontFamily }}>
      <style>{FONT_IMPORT}</style>

      {/* ---------------- TOP NAV (web) ---------------- */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-3.5"
        style={{ background: "rgba(243,238,228,0.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid #E7DFCF" }}
      >
        <div className="flex items-center gap-8">
          <span style={{ color: ink, fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <CatAvatar size={20} /> 민지의 기록
          </span>
          <nav className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setTab("home")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: tab === "home" ? "#fff" : "transparent", color: tab === "home" ? thread : inkSoft, fontWeight: 600, fontSize: 13.5 }}
            >
              <Home size={15} strokeWidth={2.3} /> 홈
            </button>
            <button
              onClick={() => setTab("timeline")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: tab === "timeline" ? "#fff" : "transparent", color: tab === "timeline" ? thread : inkSoft, fontWeight: 600, fontSize: 13.5 }}
            >
              <CalendarClock size={15} strokeWidth={2.3} /> 타임라인
            </button>
          </nav>
        </div>
        <button
          className="flex items-center justify-center rounded-full"
          style={{ width: 32, height: 32, background: "#fff", color: inkSoft }}
        >
          <CircleUser size={18} strokeWidth={2.2} />
        </button>
      </div>

      <div className="flex sm:hidden items-center gap-1 px-6 py-2" style={{ borderBottom: "1px solid #E7DFCF" }}>
        <button
          onClick={() => setTab("home")}
          className="px-3 py-1.5 rounded-lg"
          style={{ background: tab === "home" ? "#fff" : "transparent", color: tab === "home" ? thread : inkSoft, fontWeight: 600, fontSize: 13 }}
        >
          홈
        </button>
        <button
          onClick={() => setTab("timeline")}
          className="px-3 py-1.5 rounded-lg"
          style={{ background: tab === "timeline" ? "#fff" : "transparent", color: tab === "timeline" ? thread : inkSoft, fontWeight: 600, fontSize: 13 }}
        >
          타임라인
        </button>
      </div>

      {/* ---------------- PAGE CONTENT ---------------- */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {tab === "home" && (
          <div>
            <div className="rounded-3xl px-6 py-7" style={{ background: threadSoft }}>
              <div className="flex items-center gap-3">
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: 48, height: 48, background: threadSoft }}
                >
                  <CatAvatar size={34} />
                </div>
                <div>
                  <div style={{ color: inkSoft, fontSize: 12 }}>2026년 7월 13일</div>
                  <h1 style={{ color: ink, fontWeight: 800, fontSize: 24 }}>Hi 민지</h1>
                </div>
              </div>
              <p style={{ color: inkSoft, fontSize: 13.5, marginTop: 10, lineHeight: 1.6 }}>
                이번 달 대화 속에서 이런 이야기들이 이어지고 있어요.
              </p>
            </div>

            <div
              className="bg-white rounded-2xl px-5 pt-5 pb-5 -mt-6 mx-4 relative z-10"
              style={{ boxShadow: "0 10px 24px rgba(54,47,42,0.10)" }}
            >
              <span
                className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2"
                style={{ background: threadSoft, color: thread }}
              >
                7월 AI 한 줄 요약
              </span>
              <p style={{ color: ink, fontSize: 15, lineHeight: 1.65 }}>
                막막했던 취업 고민이 실제 준비로 이어지며, 처음으로 스스로에 대한 확신이
                조금씩 쌓인 한 달이었어요.
              </p>
            </div>

            {/* keyword chips - API 연결됨 */}
            <div className="flex items-center justify-between mt-9 mb-3">
              <span style={{ color: ink, fontWeight: 700, fontSize: 14.5 }}>이어지고 있는 이야기</span>
              <span style={{ color: thread, fontSize: 12.5, fontWeight: 600 }}>모두 보기</span>
            </div>

            {keywordsLoading && (
              <div style={{ color: inkFaint, fontSize: 13, padding: "12px 4px" }}>불러오는 중...</div>
            )}
            {keywordsError && (
              <div style={{ color: "#C4626B", fontSize: 13, padding: "12px 4px" }}>{keywordsError}</div>
            )}
            {!keywordsLoading && !keywordsError && (
              (() => {
                const colors = getDistinctColors(keywords.map((k) => k.name));
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {keywords.map((kw, i) => (
                      <button
                        key={kw.id}
                        onClick={() => {
                          setSelectedKeywordId(kw.id);
                          setSelectedKeyword("#" + kw.name);
                          setTab("timeline");
                        }}
                        className="kw-chip rounded-2xl px-4 py-3.5 text-left"
                        style={{ background: colors[i].bg, border: `1.5px solid ${colors[i].iconBg}`, boxShadow: "0 4px 14px rgba(54,47,42,0.06)" }}
                      >
                        <div style={{ color: colors[i].text, fontWeight: 700, fontSize: 15 }}>#{kw.name}</div>
                        <div style={{ color: colors[i].text, opacity: 0.75, fontSize: 11, marginTop: 4 }}>
                          {kw.count}회 · {formatRelativeDate(kw.lastMentioned)}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()
            )}

            <div style={{ color: ink, fontWeight: 700, fontSize: 14.5, marginTop: 30, marginBottom: 12 }}>
              월별 기록
            </div>
            {(() => {
              const months = ["m07", "m06", "m05"];
              const colors = getDistinctColors(months.map((k) => monthData[k as keyof typeof monthData].title));

              return (
                <div className="grid sm:grid-cols-3 gap-2.5">
                  {months.map((k, i) => (
                    <button
                      key={k}
                      onClick={() => setOpenMonth(k)}
                      className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left"
                      style={{ background: colors[i].bg, boxShadow: "0 4px 14px rgba(54,47,42,0.06)" }}
                    >
                      <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 34, height: 34, background: colors[i].iconBg, fontSize: 15 }}>
                        📅
                      </div>
                      <span style={{ color: ink, fontSize: 15, fontWeight: 700, flex: 1 }}>{monthData[k as keyof typeof monthData].title}</span>
                      <span style={{ color: colors[i].text, fontSize: 18, fontWeight: 700 }}>›</span>
                    </button>
                  ))}
                </div>
              );
            })()}
            <button
              onClick={() => setShowOlder((v) => !v)}
              className="w-full text-center mt-3 mb-1"
              style={{ color: thread, fontSize: 13, fontWeight: 700 }}
            >
              {showOlder ? "접기 ⌃" : "이전 기록 보기 ⌄"}
            </button>
          </div>
        )}

        {/* ---------------- TIMELINE ---------------- */}
        {tab === "timeline" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 16 }}>📅</span>
                <h1 style={{ color: ink, fontWeight: 800, fontSize: 21 }}>{selectedKeyword || "키워드를 선택해주세요"}</h1>
              </div>
              <span style={{ color: thread, fontSize: 13, fontWeight: 700 }}>지금</span>
            </div>

            {timelineLoading && (
              <div style={{ color: inkFaint, fontSize: 13, padding: "20px 4px" }}>불러오는 중...</div>
            )}
            {timelineError && (
              <div style={{ color: "#C4626B", fontSize: 13, padding: "20px 4px" }}>{timelineError}</div>
            )}
            {!timelineLoading && !timelineError && timelinePeriods.length === 0 && (
              <div style={{ color: inkFaint, fontSize: 13, padding: "20px 4px" }}>
                아직 이 키워드에 대한 주간 요약이 없어요.
              </div>
            )}

            {!timelineLoading && !timelineError && timelinePeriods.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <button
                    className="arrow-btn flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ width: 32, height: 32, background: "#fff", color: inkSoft, boxShadow: "0 4px 12px rgba(54,47,42,0.08)" }}
                    onClick={() => scrollRef.current && scrollRef.current.scrollBy({ left: -108, behavior: "smooth" })}
                    aria-label="이전 날짜"
                  >
                    ‹
                  </button>
                  <div
                    ref={scrollRef}
                    className="flex bg-white rounded-2xl overflow-x-auto flex-1"
                    style={{ boxShadow: "0 4px 16px rgba(54,47,42,0.06)", scrollbarWidth: "none" }}
                  >
                    {timelinePeriods.map((p, i) => {
                      const active = selectedPeriod === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => jumpToCard(p.id)}
                          className="flex-shrink-0 flex items-center justify-center py-3.5 px-4"
                          style={{ borderLeft: i === 0 ? "none" : "1px solid #EEE7D9", width: 108 }}
                        >
                          <span
                            className="flex flex-col items-center justify-center rounded-xl px-3 py-1.5"
                            style={{
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              background: active ? thread : "transparent",
                              color: active ? "#fff" : ink,
                            }}
                          >
                            <span style={{ fontSize: 11.5 }}>{p.sub}</span>
                            <span style={{ fontSize: 9.5, opacity: 0.75, marginTop: 1 }}>{p.date}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="arrow-btn flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ width: 32, height: 32, background: "#fff", color: inkSoft, boxShadow: "0 4px 12px rgba(54,47,42,0.08)" }}
                    onClick={() => scrollRef.current && scrollRef.current.scrollBy({ left: 108, behavior: "smooth" })}
                    aria-label="다음 날짜"
                  >
                    ›
                  </button>
                </div>

                <div className="mt-6 flex flex-col gap-4">
                  {timelinePeriods.map((p) => {
                    const isHighlighted = highlightedCard === p.id;
                    return (
                      <div key={p.id} ref={(el) => (cardRefs.current[p.id] = el)}>
                        <div className="flex items-center justify-between mb-1.5 px-1">
                          <span style={{ color: orange, fontWeight: 700, fontSize: 12 }}>{p.sub}</span>
                          <span style={{ color: inkFaint, fontSize: 11 }}>{p.date}</span>
                        </div>
                        <div className="flex">
                          <div className="rounded-full" style={{ width: 4, background: orange, marginRight: 12 }} />
                          <div
                            className="flex-1 bg-white rounded-2xl px-5 py-4"
                            style={{
                              boxShadow: isHighlighted
                                ? "0 0 0 3px #EFA24A, 0 4px 16px rgba(54,47,42,0.06)"
                                : "0 4px 16px rgba(54,47,42,0.06)",
                              transition: "box-shadow .3s ease",
                            }}
                          >
                            <div style={{ color: ink, fontWeight: 700, fontSize: 15 }}>{p.title}</div>
                            <div style={{ color: inkSoft, fontSize: 13, marginTop: 4, lineHeight: 1.55 }}>{p.desc}</div>
                            <div className="mt-3 pt-3" style={{ borderTop: "1px solid #F0ECE1" }}>
                              <div style={{ color: inkFaint, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                                이 시기에 집중했던 것
                              </div>
                              <div style={{ color: ink, fontSize: 13, lineHeight: 1.6 }}>{p.focus}</div>
                              <div className="flex items-center gap-4 mt-2">
                                {p.emo.map((em, i) => (
                                  <div key={i} className="flex items-center gap-1.5">
                                    <EmoBlob name={em.n} size={26} />
                                    <span style={{ color: thread, fontSize: 12, fontWeight: 600 }}>
                                      {em.n} {em.p}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ---------------- month detail modal (web dialog) ---------------- */}
      {openMonth && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(30,26,20,0.42)" }}
            onClick={() => setOpenMonth(null)}
          />
          <div
            className="fixed z-50 left-1/2 top-1/2 rounded-3xl px-6 pt-5 pb-7"
            style={{
              transform: "translate(-50%,-50%)",
              width: "min(92vw, 420px)",
              maxHeight: "84vh",
              overflowY: "auto",
              background: paper,
              boxShadow: "0 30px 60px rgba(0,0,0,0.25)",
            }}
          >
            <h2 style={{ color: ink, fontWeight: 700, fontSize: 19, marginBottom: 16 }}>
              {monthData[openMonth].title}
            </h2>

            <div style={{ color: thread, fontWeight: 700, fontSize: 11, textTransform: "uppercase", marginBottom: 6 }}>
              주로 했던 고민
            </div>
            {monthData[openMonth].worries.map((w, i) => (
              <div key={i} style={{ color: ink, fontSize: 14, padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid #EEE7D9" }}>
                {w}
              </div>
            ))}

            <div style={{ color: thread, fontWeight: 700, fontSize: 11, textTransform: "uppercase", margin: "18px 0 6px" }}>
              목표했던 것
            </div>
            {monthData[openMonth].goals.map((g, i) => (
              <div key={i} style={{ color: ink, fontSize: 14, padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid #EEE7D9" }}>
                {g}
              </div>
            ))}

            <div style={{ color: thread, fontWeight: 700, fontSize: 11, textTransform: "uppercase", margin: "18px 0 8px" }}>
              우세했던 감정 두 가지
            </div>
            <div className="flex gap-3">
              {monthData[openMonth].emotions.map((em, i) => (
                <div key={i} className="flex-1 rounded-xl text-center py-3.5" style={{ background: "#EAE3D4" }}>
                  <div className="flex justify-center"><EmoBlob name={em.n} size={44} /></div>
                  <div style={{ color: ink, fontSize: 13, fontWeight: 600, marginTop: 6 }}>{em.n}</div>
                  <div style={{ color: inkFaint, fontSize: 11.5 }}>{em.p}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {/* ---------------- BOTTOM BAR ---------------- */}
      <div className="sticky bottom-0 z-30 flex justify-center px-6 pb-4 pt-2" style={{ background: "linear-gradient(to top, #F3EEE4 60%, rgba(243,238,228,0))" }}>
        <div
          className="flex items-center gap-1 rounded-2xl p-1.5"
          style={{ background: "rgba(54,47,42,0.94)", backdropFilter: "blur(8px)" }}
        >
          <button
            onClick={() => setTab("home")}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl"
            style={{ background: tab === "home" ? paper : "transparent" }}
          >
            <Home size={16} strokeWidth={2.3} color={tab === "home" ? thread : "#C9C2B6"} />
            <span style={{ color: tab === "home" ? thread : "#C9C2B6", fontSize: 12.5, fontWeight: 700 }}>홈</span>
          </button>
          <button
            onClick={() => setTab("timeline")}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl"
            style={{ background: tab === "timeline" ? paper : "transparent" }}
          >
            <CalendarClock size={16} strokeWidth={2.3} color={tab === "timeline" ? thread : "#C9C2B6"} />
            <span style={{ color: tab === "timeline" ? thread : "#C9C2B6", fontSize: 12.5, fontWeight: 700 }}>타임라인</span>
          </button>
          <button
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl"
            style={{ background: "transparent" }}
          >
            <CircleUser size={16} strokeWidth={2.3} color="#C9C2B6" />
            <span style={{ color: "#C9C2B6", fontSize: 12.5, fontWeight: 700 }}>프로필</span>
          </button>
          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.15)", margin: "0 2px" }} />
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl"
            style={{ background: "transparent" }}
          >
            <Upload size={16} strokeWidth={2.3} color="#EFA24A" />
            <span style={{ color: "#EFA24A", fontSize: 12.5, fontWeight: 700 }}>대화 업로드</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {uploadedFile && (
        <div
          className="fixed left-1/2 z-50 rounded-xl px-4 py-3"
          style={{
            bottom: 88,
            transform: "translateX(-50%)",
            background: ink,
            color: "#fff",
            fontSize: 13,
            boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
            maxWidth: "90vw",
          }}
        >
          📄 {uploadedFile}
        </div>
      )}
    </div>
  );
}