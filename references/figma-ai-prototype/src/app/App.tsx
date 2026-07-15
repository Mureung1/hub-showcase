import { useState, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./components/ui/tooltip";
import {
  LayoutDashboard,
  CheckSquare,
  Folder,
  Users,
  Bot,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Link2,
  Image,
  Calendar,
  Sparkles,
  Layers,
  FileText,
  Bold,
  Italic,
  List,
  Code,
  Heading1,
  Heading2,
  Eye,
  PenLine,
} from "lucide-react";

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const ACCENT = "oklch(0.38 0.045 262)";
const ACCENT_TINT = "#EAECF1";
const TEXT_PRIMARY = "#1C1C1E";
const TEXT_SECONDARY = "#47474F";
const BORDER = "#E6E5E1";
const BG_SUNKEN = "#FAFAF8";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type TaskStatus = "시작 전" | "진행 중" | "검토 중" | "완료";
type FilterStatus = "전체" | TaskStatus;
type Page = "dashboard" | "tasks" | "team" | "notes" | "resources" | "ai";
type TaskView = "목록" | "보드";

interface Task {
  id: string;
  projectId: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: TaskStatus;
  description?: string;
  isNew?: boolean;
}

interface Project {
  id: string;
  name: string;
  description: string;
  period: string;
  status: "진행 중" | "시작 전" | "완료";
  memberIds: string[];
  creatorId: string;
}

interface TeamMember {
  id: string;
  name: string;
  initial: string;
  role: string;
  description: string;
  isAI: boolean;
  color: string;
}

interface Note {
  id: string;
  projectId: string;
  title: string;
  content: string;
  updatedAt: string;
  author: string;
}

interface Resource {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  owner: string;
  date: string;
  type: "폴더" | "문서" | "링크" | "이미지";
}

// ─────────────────────────────────────────────
// STATUS CONFIG
// ─────────────────────────────────────────────
const STATUS_CONFIG: Record<TaskStatus, { bg: string; fg: string; dot: string }> = {
  "시작 전": { bg: "#F2F2F4", fg: "#38383F", dot: "#8A8A96" },
  "진행 중": { bg: "#EEF3FF", fg: "#2A4CA0", dot: "#3860C9" },
  "검토 중": { bg: "#FFF8EC", fg: "#6B3E00", dot: "#B87800" },
  "완료":    { bg: "#EDF8F2", fg: "#175538", dot: "#22704A" },
};

// ─────────────────────────────────────────────
// NOTE TEMPLATES
// ─────────────────────────────────────────────
const NOTE_TEMPLATES = [
  { id: "blank",    label: "빈 문서",   content: "" },
  { id: "plan",     label: "기획 문서", content: "# 기획 문서\n\n## 목적\n\n## 범위\n\n## 주요 기능\n\n## 일정\n\n## 기타" },
  { id: "decision", label: "결정 기록", content: "# 결정 기록\n\n## 결정 사항\n\n## 배경 및 이유\n\n## 대안 검토\n\n## 영향 범위\n\n## 결정일" },
  { id: "research", label: "조사 노트", content: "# 조사 노트\n\n## 조사 목적\n\n## 주요 내용\n\n## 참고 자료\n\n## 결론" },
  { id: "meeting",  label: "회의 정리", content: "# 회의 정리\n\n## 일시 및 참석자\n\n## 논의 사항\n\n## 결정 사항\n\n## 다음 액션 아이템" },
];

// ─────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────
const INITIAL_PROJECTS: Project[] = [
  { id: "1", name: "팀플 관리 웹서비스 (TeamFlow)", description: "부트캠프 4주 개인 프로젝트 · 팀플 정보를 한 공간에서 관리", period: "07.01 ~ 07.31", status: "진행 중", memberIds: ["1", "2", "5", "6", "4"], creatorId: "1" },
  { id: "2", name: "교내 창업 공모전 기획안", description: "플랫폼 비즈니스 아이디어 스케치와 팀원 역할 배분", period: "07.15 ~ 08.15", status: "진행 중", memberIds: ["1", "2", "3", "4"], creatorId: "1" },
  { id: "3", name: "캡스톤 디자인 (졸업작품)", description: "AI 기반 개인화 일정 추천 시스템 개발", period: "03.02 ~ 11.30", status: "진행 중", memberIds: ["1", "6", "5"], creatorId: "1" },
  { id: "4", name: "오픈소스 컨트리뷰톤 2024", description: "프론트엔드 오픈소스 이슈 해결 및 PR 제출", period: "08.01 ~ 08.31", status: "시작 전", memberIds: ["1"], creatorId: "1" },
];

const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  { id: "1", name: "이주환", initial: "이", role: "개발 / 프로젝트 관리", description: "전체 프론트엔드 개발 및 일정 관리 담당", isAI: false, color: "#3A6898" },
  { id: "2", name: "김민지", initial: "김", role: "서비스 기획 / PM", description: "문제 정의, 요구사항 명세서 작성 및 전반적인 프로젝트 기획", isAI: false, color: "#8A4E68" },
  { id: "3", name: "박서준", initial: "박", role: "자료조사 / 마케팅", description: "시장 조사, 유사 서비스 분석 및 마케팅 전략 수립", isAI: false, color: "#2E7878" },
  { id: "5", name: "최지우", initial: "최", role: "UI/UX 디자인", description: "디자인 시스템 구축, 와이어프레임 및 하이파이 프로토타입 제작", isAI: false, color: "#3D7A54" },
  { id: "6", name: "정태호", initial: "정", role: "백엔드 개발 / 인프라", description: "API 서버 아키텍처 설계 및 클라우드 인프라(AWS) 구축", isAI: false, color: "#48688A" },
  { id: "4", name: "자료조사 AI", initial: "AI", role: "자료조사 · AI 팀원", description: "사람 팀원과 동일한 방식으로 역할을 배정받는 AI입니다. 공유 노트와 자료를 바탕으로 요약, 번역, 리서치 결과를 도출합니다.", isAI: true, color: "#6B4CA8" },
];

const INITIAL_TASKS: Task[] = [
  { id: "1",   projectId: "1", title: "기획서 최종 정리",                   assignee: "김민지",      dueDate: "07.08", status: "완료",    description: "요구사항 정의서 및 1차 기능 명세서 작성 완료" },
  { id: "2",   projectId: "1", title: "초기 회의 일정 조율",                assignee: "이주환",      dueDate: "07.06", status: "완료" },
  { id: "3",   projectId: "1", title: "대시보드 레이아웃 개발",              assignee: "이주환",      dueDate: "07.16", status: "진행 중",  description: "Tailwind CSS를 활용하여 메인 대시보드 컴포넌트 마크업" },
  { id: "4",   projectId: "1", title: "DB 테이블 스키마 설계",               assignee: "정태호",      dueDate: "07.14", status: "검토 중",  description: "Supabase를 사용하기 위한 User, Task, Project 테이블 구조 초안" },
  { id: "5",   projectId: "1", title: "유사 서비스 레퍼런스 분석",            assignee: "자료조사 AI", dueDate: "07.11", status: "완료",    description: "Notion, Linear, Trello 기능 비교 리포트 작성" },
  { id: "t11", projectId: "1", title: "디자인 시스템 토큰 정리",              assignee: "최지우",      dueDate: "07.13", status: "완료",    description: "Figma에 폰트, 색상, Spacing 토큰 정리" },
  { id: "t12", projectId: "1", title: "백엔드 REST API 명세서 작성",          assignee: "정태호",      dueDate: "07.18", status: "진행 중" },
  { id: "t13", projectId: "1", title: "로그인 화면 퍼블리싱",                assignee: "이주환",      dueDate: "07.20", status: "시작 전" },
  { id: "t14", projectId: "1", title: "사용자 사용성 테스트(UT) 질문지 작성", assignee: "김민지",      dueDate: "07.22", status: "시작 전" },
  { id: "t15", projectId: "1", title: "일러스트 및 아이콘 에셋 추출",         assignee: "최지우",      dueDate: "07.17", status: "진행 중" },
  { id: "7",   projectId: "2", title: "공모전 요강 및 평가 기준 분석",        assignee: "김민지",      dueDate: "07.16", status: "완료" },
  { id: "8",   projectId: "2", title: "1차 아이디어 브레인스토밍",            assignee: "이주환",      dueDate: "07.17", status: "완료" },
  { id: "t21", projectId: "2", title: "시장 규모(TAM, SAM, SOM) 리서치",      assignee: "박서준",      dueDate: "07.22", status: "진행 중", description: "관련 논문 및 통계청 자료 기반" },
  { id: "t22", projectId: "2", title: "피치덱(Pitch Deck) 스토리라인 구성",   assignee: "김민지",      dueDate: "07.25", status: "진행 중" },
  { id: "t23", projectId: "2", title: "솔루션 시연용 간단한 와이어프레임",     assignee: "이주환",      dueDate: "07.28", status: "시작 전" },
  { id: "t24", projectId: "2", title: "최근 3년 창업 트렌드 및 기사 수집",    assignee: "자료조사 AI", dueDate: "07.20", status: "검토 중", description: "SaaS 및 B2B 협업 툴 관련 기사 스크랩" },
  { id: "t25", projectId: "2", title: "경쟁사 SWOT 분석",                    assignee: "박서준",      dueDate: "07.24", status: "시작 전" },
  { id: "t31", projectId: "3", title: "졸업작품 주제 선정 보고서 제출",       assignee: "이주환",      dueDate: "03.15", status: "완료" },
  { id: "t32", projectId: "3", title: "지도교수님 1차 멘토링 미팅",           assignee: "이주환",      dueDate: "03.20", status: "완료" },
  { id: "t33", projectId: "3", title: "전체 시스템 아키텍처 다이어그램",      assignee: "정태호",      dueDate: "04.10", status: "완료" },
  { id: "t34", projectId: "3", title: "일정 추천 AI 모델 리서치",             assignee: "이주환",      dueDate: "07.30", status: "진행 중", description: "Collaborative Filtering 및 간단한 NLP 모델 조사" },
  { id: "t35", projectId: "3", title: "핵심 화면 Hi-Fi UI 디자인",            assignee: "최지우",      dueDate: "07.25", status: "검토 중" },
  { id: "t36", projectId: "3", title: "AWS EC2 및 RDS 초기 세팅",             assignee: "정태호",      dueDate: "07.28", status: "진행 중" },
  { id: "t37", projectId: "3", title: "OAuth 2.0 소셜 로그인 구현",           assignee: "정태호",      dueDate: "08.05", status: "시작 전" },
  { id: "t41", projectId: "4", title: "참여할 타겟 오픈소스 프로젝트 선정",    assignee: "이주환",      dueDate: "08.05", status: "진행 중", description: "React 또는 Vue 관련 생태계 라이브러리 위주로 탐색" },
  { id: "t42", projectId: "4", title: "컨트리뷰션 가이드라인(CONTRIBUTING.md) 숙지", assignee: "이주환", dueDate: "08.07", status: "시작 전" },
  { id: "t43", projectId: "4", title: "로컬 환경 빌드 및 테스트 코드 실행",   assignee: "이주환",      dueDate: "08.10", status: "시작 전" },
];

const INITIAL_NOTES: Note[] = [
  { id: "1", projectId: "1", title: "팀플 관리 서비스 기획 아이디어 및 차별점", content: `# 핵심 기능 정리\n\n팀 프로젝트에서 가장 필요한 기능들:\n\n- **할 일 관리**: 상태별 태그와 담당자 지정\n- **팀원 역할**: 각 팀원의 역할과 업무 명확화\n- **자료 링크**: 흩어진 참고 자료를 한 곳에 모아보기\n\n## 기존 툴과의 차별점\n\n기존 Notion이나 Jira는 너무 범용적이거나 개발자 친화적임. 대학생/취준생이 가볍게 쓰기 좋은 **'AI가 포함된 가상 팀룸'** 컨셉으로 접근하자.\n\n## 다음 단계\n1. 핵심 화면 스케치 (대시보드, 할 일)\n2. 디자인 톤앤매너 결정\n3. 프레임워크 선정`, updatedAt: "07.10", author: "김민지" },
  { id: "2", projectId: "2", title: "공모전 피치덱 발표 준비 체크리스트", content: `## 발표 당일 준비물\n\n- 노트북 충전기, C타입 허브\n- 발표자료 최종본 PDF (USB에 여분 저장)\n- 시연용 데모 계정 로그인 확인\n\n> 발표 시간: 08.20 오후 3시 (예정)\n\n## 피치덱 순서 (초안)\n\n1. 문제 제기: 대학생 팀플의 3가지 고질적 문제 (3분)\n2. 솔루션: TeamFlow 핵심 데모 시연 (5분)\n3. 시장성 및 BM: 타겟 고객층 (2분)\n4. Q&A (3분)`, updatedAt: "07.09", author: "이주환" },
  { id: "3", projectId: "1", title: "자료 조사 링크 모음 (AI 요약본)", content: `# 참고 서비스 리서치\n\n## 1. Linear\n- **장점**: 압도적인 속도, 키보드 단축키 지원, 깔끔한 다크모드 UI\n- **단점**: 일반인이나 대학생이 쓰기엔 러닝 커브가 있음\n\n## 2. Notion\n- **장점**: 자유도가 높고 문서 작성에 탁월함\n- **단점**: 구조를 직접 만들어야 해서 프로젝트 초기 세팅이 귀찮음\n\n## 3. Trello\n- **장점**: 칸반 보드의 직관성\n- **단점**: 규모가 커지면 보드가 너무 복잡해짐\n\n**결론**: Trello의 직관성과 Linear의 속도를 차용하되, 복잡한 기능은 덜어내자.`, updatedAt: "07.11", author: "자료조사 AI" },
  { id: "4", projectId: "1", title: "디자인 시스템 컬러 & 타이포그래피 규칙", content: `# Design System\n\n## Colors\n- **Primary (Accent)**: #3860C9\n- **Background**: #F4F4F2\n- **Text Primary**: #1C1C1E\n\n## Typography\n- **기본 폰트**: Pretendard\n- **숫자/코드**: JetBrains Mono\n\n## Component Rules\n- 버튼은 항상 12px border-radius 적용\n- 그림자는 은은하게 퍼지는 rgba(0,0,0,0.06) 사용`, updatedAt: "07.13", author: "최지우" },
  { id: "5", projectId: "3", title: "캡스톤 1차 지도교수 미팅 피드백", content: `## 피드백 내용 요약 (03.20)\n\n1. **추천 알고리즘의 기준 부족**\n단순히 시간이 비었다고 일정을 추천하는 것은 의미 없음. 사용자의 '컨디션'이나 '집중도' 데이터를 어떻게 수집할 것인지 보완할 것.\n\n2. **앱 vs 웹**\n모바일 웹으로 먼저 MVP를 구현하고, 이후 PWA 형태로 발전시키는 방향으로 승인 받음.\n\n3. **일정 산정**\n11월 최종 발표이므로 9월 초까지는 실제 동작하는 베타 버전이 나와야 함.`, updatedAt: "03.21", author: "이주환" },
];

const INITIAL_RESOURCES: Resource[] = [
  { id: "1",  projectId: "1", name: "회의 자료 및 녹음본",       owner: "이주환",      date: "07.07", type: "폴더" },
  { id: "2",  projectId: "1", name: "PRD_요구사항정의서.md",      description: "문제 정의와 핵심 기능, 유저 스토리 정리",  owner: "김민지",      date: "07.08", type: "문서" },
  { id: "3",  projectId: "1", name: "Figma 와이어프레임 링크",    description: "대시보드 및 할 일 관리 UI 스케치",         owner: "최지우",      date: "07.12", type: "링크" },
  { id: "4",  projectId: "1", name: "DB_Schema_v1.pdf",          description: "유저 및 프로젝트 릴레이션 다이어그램",      owner: "정태호",      date: "07.14", type: "문서" },
  { id: "5",  projectId: "1", name: "경쟁사_분석_리포트.docx",    description: "유사 서비스 장단점 비교 리포트",           owner: "자료조사 AI", date: "07.11", type: "문서" },
  { id: "6",  projectId: "1", name: "TeamFlow_Logo_Final.png",   description: "앱 서비스 메인 로고 에셋",                 owner: "최지우",      date: "07.13", type: "이미지" },
  { id: "7",  projectId: "1", name: "API Docs (Swagger)",        description: "백엔드 API 명세 접속 링크",               owner: "정태호",      date: "07.16", type: "링크" },
  { id: "8",  projectId: "2", name: "Notion 팀 프로젝트 템플릿",  description: "기존 템플릿 레퍼런스",                    owner: "김민지",      date: "07.07", type: "링크" },
  { id: "9",  projectId: "2", name: "시장조사 통계 자료 모음",    owner: "박서준",      date: "07.20", type: "폴더" },
  { id: "10", projectId: "3", name: "AWS 인프라 다이어그램.png",  owner: "정태호",      date: "04.10", type: "이미지" },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function calcProgress(projectId: string, tasks: Task[]) {
  const pt = tasks.filter(t => t.projectId === projectId);
  if (pt.length === 0) return 0;
  return Math.round((pt.filter(t => t.status === "완료").length / pt.length) * 100);
}

// ─────────────────────────────────────────────
// PRIMITIVE COMPONENTS
// ─────────────────────────────────────────────
function Avatar({ initial, color, size = "sm" }: { initial: string; color: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-11 h-11 text-sm" : size === "md" ? "w-8 h-8 text-xs" : "w-7 h-7 text-xs";
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 select-none`}
      style={{ backgroundColor: color }}>
      {initial}
    </div>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.fg, borderRadius: "7px", padding: "4px 9px", fontSize: "11px", lineHeight: "16px", letterSpacing: "0.01em" }}>
      <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ backgroundColor: c.dot }} />
      {status}
    </span>
  );
}

function ResourceIcon({ type }: { type: Resource["type"] }) {
  const map = {
    폴더:   { icon: <Folder   size={13} />, bg: "#FFF4D8", color: "#8A5A00" },
    문서:   { icon: <FileText size={13} />, bg: "#EAF1FF", color: "#3860C9" },
    링크:   { icon: <Link2    size={13} />, bg: ACCENT_TINT, color: ACCENT  },
    이미지: { icon: <Image    size={13} />, bg: "#E8F5EE", color: "#22704A" },
  };
  const c = map[type];
  return (
    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: c.bg, color: c.color, borderRadius: "8px" }}>
      {c.icon}
    </div>
  );
}

type MonoProps = React.ComponentPropsWithoutRef<"span">;
function Mono({ children, className = "", style, ...props }: MonoProps) {
  return (
    <span {...props} className={className}
      style={{ fontFamily: "'JetBrains Mono','SFMono-Regular',Consolas,monospace", fontVariantNumeric: "tabular-nums slashed-zero", ...style }}>
      {children}
    </span>
  );
}

function Divider() { return <div className="h-px" style={{ backgroundColor: BORDER }} />; }

const btnPrimary = "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500";

function IconBtn({ onClick, label, children }: { onClick?: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className="w-7 h-7 flex items-center justify-center transition-colors hover:bg-[#F0F0F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      style={{ borderRadius: "8px", color: TEXT_SECONDARY }}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────
// NEW PROJECT MODAL
// ─────────────────────────────────────────────
function NewProjectModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (p: Omit<Project, "id" | "creatorId" | "memberIds">) => void;
}) {
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [period,      setPeriod]      = useState("");
  const [status,      setStatus]      = useState<Project["status"]>("진행 중");
  const [errors,      setErrors]      = useState<{ name?: string }>({});

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErrors({ name: "프로젝트 이름을 입력해 주세요." }); return; }
    onSubmit({ name: name.trim(), description: description.trim(), period: period.trim() || "미정", status });
  }

  const inputStyle: React.CSSProperties = { backgroundColor: BG_SUNKEN, border: `1px solid ${BORDER}`, borderRadius: "12px", color: TEXT_PRIMARY, outline: "none", width: "100%", padding: "9px 14px", fontSize: "14px" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 500, color: TEXT_PRIMARY, marginBottom: "6px" };
  const canSubmit = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(28,28,30,0.35)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div className="relative bg-white w-full max-w-[440px] overflow-hidden" style={{ borderRadius: "20px", boxShadow: "0 12px 28px rgba(28,28,30,0.12)" }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <h2 className="text-[15px] font-semibold" style={{ color: TEXT_PRIMARY }}>새 프로젝트 만들기</h2>
          <IconBtn onClick={onClose} label="닫기"><X size={15} /></IconBtn>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label style={labelStyle}>프로젝트 이름 <span style={{ color: "#A3323A" }}>*</span></label>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setErrors({}); }}
              placeholder="예: 교내 해커톤 팀 프로젝트"
              style={{ ...inputStyle, borderColor: errors.name ? "#A3323A" : BORDER }} />
            {errors.name && <p className="text-xs mt-1" style={{ color: "#A3323A" }}>{errors.name}</p>}
          </div>
          <div>
            <label style={labelStyle}>설명</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="프로젝트에 대한 간단한 설명" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>기간</label>
            <input type="text" value={period} onChange={e => setPeriod(e.target.value)}
              placeholder="예: 08.01 ~ 08.31" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>상태</label>
            <div className="grid grid-cols-3 gap-2">
              {(["시작 전", "진행 중", "완료"] as Project["status"][]).map(s => {
                const sel = status === s;
                const bgMap: Record<string, string> = { "시작 전": "#EDEDF0", "진행 중": "#EAF1FF", "완료": "#E8F5EE" };
                const fgMap: Record<string, string> = { "시작 전": "#3A3A44", "진행 중": "#2E52B0", "완료": "#1A6040" };
                return (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className="px-3 py-2.5 text-sm font-medium transition-all focus:outline-none"
                    style={{ borderRadius: "12px", border: sel ? `1.5px solid ${fgMap[s]}` : `1px solid ${BORDER}`, backgroundColor: sel ? bgMap[s] : "#FFFFFF", color: sel ? fgMap[s] : TEXT_SECONDARY }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium transition-colors hover:bg-[#EAEAEA] focus:outline-none"
              style={{ backgroundColor: "#F0F0F2", borderRadius: "12px", color: TEXT_PRIMARY }}>취소</button>
            <button type="submit" disabled={!canSubmit}
              className="flex-1 py-2.5 text-sm font-medium text-white transition-opacity focus:outline-none"
              style={{ backgroundColor: ACCENT, borderRadius: "12px", opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? "pointer" : "not-allowed" }}>
              프로젝트 만들기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADD MEMBER MODAL
// ─────────────────────────────────────────────
function AddMemberModal({ onClose, onSubmit, existingMembers }: {
  onClose: () => void;
  onSubmit: (m: Omit<TeamMember, "id">) => void;
  existingMembers: TeamMember[];
}) {
  const [name,        setName]        = useState("");
  const [role,        setRole]        = useState("");
  const [description, setDescription] = useState("");
  const [errors,      setErrors]      = useState<{ name?: string; role?: string }>({});

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const COLORS = ["#3A6898", "#8A4E68", "#2E7878", "#3D7A54", "#48688A", "#6A4878", "#2E6888", "#5A6840"];
  const canSubmit = name.trim().length > 0 && role.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = "이름을 입력해 주세요.";
    if (!role.trim()) errs.role = "역할을 입력해 주세요.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const color = COLORS[existingMembers.filter(m => !m.isAI).length % COLORS.length];
    onSubmit({ name: name.trim(), initial: name.trim().slice(0, 1), role: role.trim(), description: description.trim(), isAI: false, color });
  }

  const inputStyle: React.CSSProperties = { backgroundColor: BG_SUNKEN, border: `1px solid ${BORDER}`, borderRadius: "12px", color: TEXT_PRIMARY, outline: "none", width: "100%", padding: "9px 14px", fontSize: "14px" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 500, color: TEXT_PRIMARY, marginBottom: "6px" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(28,28,30,0.35)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div className="relative bg-white w-full max-w-[440px] overflow-hidden" style={{ borderRadius: "20px", boxShadow: "0 12px 28px rgba(28,28,30,0.12)" }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <h2 className="text-[15px] font-semibold" style={{ color: TEXT_PRIMARY }}>팀원 추가</h2>
          <IconBtn onClick={onClose} label="닫기"><X size={15} /></IconBtn>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label style={labelStyle}>이름 <span style={{ color: "#A3323A" }}>*</span></label>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })); }}
              placeholder="팀원 이름"
              style={{ ...inputStyle, borderColor: errors.name ? "#A3323A" : BORDER }} />
            {errors.name && <p className="text-xs mt-1" style={{ color: "#A3323A" }}>{errors.name}</p>}
          </div>
          <div>
            <label style={labelStyle}>역할 <span style={{ color: "#A3323A" }}>*</span></label>
            <input type="text" value={role} onChange={e => { setRole(e.target.value); setErrors(p => ({ ...p, role: undefined })); }}
              placeholder="예: 프론트엔드 개발 / 디자인"
              style={{ ...inputStyle, borderColor: errors.role ? "#A3323A" : BORDER }} />
            {errors.role && <p className="text-xs mt-1" style={{ color: "#A3323A" }}>{errors.role}</p>}
          </div>
          <div>
            <label style={labelStyle}>소개 <span className="font-normal" style={{ color: TEXT_SECONDARY, fontSize: "12px" }}>(선택)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="팀원에 대한 간단한 소개" rows={2}
              style={{ ...inputStyle, resize: "none", lineHeight: "1.6" }} />
          </div>
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium transition-colors hover:bg-[#EAEAEA] focus:outline-none"
              style={{ backgroundColor: "#F0F0F2", borderRadius: "12px", color: TEXT_PRIMARY }}>취소</button>
            <button type="submit" disabled={!canSubmit}
              className="flex-1 py-2.5 text-sm font-medium text-white focus:outline-none"
              style={{ backgroundColor: ACCENT, borderRadius: "12px", opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? "pointer" : "not-allowed" }}>
              팀원 추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADD RESOURCE MODAL
// ─────────────────────────────────────────────
function AddResourceModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (r: Omit<Resource, "id" | "projectId">) => void;
}) {
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [type,        setType]        = useState<Resource["type"]>("문서");
  const [errors,      setErrors]      = useState<{ name?: string }>({});

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const canSubmit = name.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErrors({ name: "자료 이름을 입력해 주세요." }); return; }
    const now = new Date();
    const date = `${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
    onSubmit({ name: name.trim(), description: description.trim() || undefined, type, owner: "이주환", date });
  }

  const inputStyle: React.CSSProperties = { backgroundColor: BG_SUNKEN, border: `1px solid ${BORDER}`, borderRadius: "12px", color: TEXT_PRIMARY, outline: "none", width: "100%", padding: "9px 14px", fontSize: "14px" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 500, color: TEXT_PRIMARY, marginBottom: "6px" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(28,28,30,0.35)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div className="relative bg-white w-full max-w-[440px] overflow-hidden" style={{ borderRadius: "20px", boxShadow: "0 12px 28px rgba(28,28,30,0.12)" }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <h2 className="text-[15px] font-semibold" style={{ color: TEXT_PRIMARY }}>자료 추가</h2>
          <IconBtn onClick={onClose} label="닫기"><X size={15} /></IconBtn>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label style={labelStyle}>자료 이름 <span style={{ color: "#A3323A" }}>*</span></label>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setErrors({}); }}
              placeholder="예: 시장조사 결과.pdf"
              style={{ ...inputStyle, borderColor: errors.name ? "#A3323A" : BORDER }} />
            {errors.name && <p className="text-xs mt-1" style={{ color: "#A3323A" }}>{errors.name}</p>}
          </div>
          <div>
            <label style={labelStyle}>유형</label>
            <div className="grid grid-cols-4 gap-2">
              {(["폴더", "문서", "링크", "이미지"] as Resource["type"][]).map(t => {
                const sel = type === t;
                return (
                  <button key={t} type="button" onClick={() => setType(t)}
                    className="px-3 py-2 text-sm font-medium transition-all focus:outline-none"
                    style={{ borderRadius: "10px", border: sel ? `1.5px solid ${ACCENT}` : `1px solid ${BORDER}`, backgroundColor: sel ? ACCENT_TINT : "#FFFFFF", color: sel ? ACCENT : TEXT_SECONDARY }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={labelStyle}>설명 <span className="font-normal" style={{ color: TEXT_SECONDARY, fontSize: "12px" }}>(선택)</span></label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="자료에 대한 간단한 설명" style={inputStyle} />
          </div>
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium transition-colors hover:bg-[#EAEAEA] focus:outline-none"
              style={{ backgroundColor: "#F0F0F2", borderRadius: "12px", color: TEXT_PRIMARY }}>취소</button>
            <button type="submit" disabled={!canSubmit}
              className="flex-1 py-2.5 text-sm font-medium text-white focus:outline-none"
              style={{ backgroundColor: ACCENT, borderRadius: "12px", opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? "pointer" : "not-allowed" }}>
              자료 추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HOME SIDEBAR
// ─────────────────────────────────────────────
function HomeSidebar({ page, setPage, onNewProject }: {
  page: "projects" | "tasks" | "team";
  setPage: (p: "projects" | "tasks" | "team") => void;
  onNewProject: () => void;
}) {
  const navMain = [
    { id: "projects" as const, icon: <Layers size={15} />,      label: "프로젝트" },
    { id: "tasks"    as const, icon: <CheckSquare size={15} />, label: "내 할 일"  },
    { id: "team"     as const, icon: <Users size={15} />,       label: "전체 팀원" },
  ];

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-full" style={{ backgroundColor: "#FFFFFF", borderRight: `1px solid ${BORDER}` }}>
      <div className="px-5 py-[18px]" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ACCENT, borderRadius: "10px" }}>
            <span className="text-white text-xs font-bold tracking-tight">TF</span>
          </div>
          <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>TeamFlow</span>
        </div>
      </div>
      <div className="px-3 pt-3 pb-1">
        <button onClick={onNewProject} className={`${btnPrimary} w-full justify-center`}
          style={{ backgroundColor: ACCENT, borderRadius: "12px" }}>
          <Plus size={14} />새 프로젝트
        </button>
      </div>
      <nav className="flex-1 px-3 py-2 space-y-px overflow-y-auto">
        <p className="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>개요</p>
        {navMain.map(item => {
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => setPage(item.id)}
              className="w-full flex items-center gap-2.5 px-3 py-[7px] text-sm text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              style={{ borderRadius: "12px", backgroundColor: active ? ACCENT_TINT : "transparent", color: active ? ACCENT : TEXT_SECONDARY, fontWeight: active ? 500 : 400 }}>
              {item.icon}{item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <Avatar initial="이" color="#3860C9" size="sm" />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: TEXT_PRIMARY }}>이주환</p>
            <p className="text-[11px]" style={{ color: TEXT_SECONDARY }}>내 계정</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// PROJECT SIDEBAR
// ─────────────────────────────────────────────
function ProjectSidebar({ page, setPage, onBack, project }: {
  page: Page; setPage: (p: Page) => void; onBack: () => void; project: Project;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const nav: Array<{ id: Page; icon: React.ReactNode; label: string }> = [
    { id: "dashboard", icon: <LayoutDashboard size={15} />, label: "대시보드" },
    { id: "tasks",     icon: <CheckSquare size={15} />,     label: "할 일"    },
    { id: "notes",     icon: <FileText size={15} />,        label: "공유 노트" },
    { id: "resources", icon: <Folder size={15} />,          label: "자료실"   },
    { id: "team",      icon: <Users size={15} />,           label: "팀원"     },
    { id: "ai",        icon: <Bot size={15} />,             label: "AI 팀원"  },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="flex-shrink-0 flex flex-col h-full transition-all duration-200"
        style={{ width: collapsed ? "52px" : "220px", backgroundColor: "#FFFFFF", borderRight: `1px solid ${BORDER}` }}>
        <div className="flex items-center px-3 pt-4 pb-3" style={{ borderBottom: `1px solid ${BORDER}`, minHeight: "60px" }}>
          {collapsed ? (
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 mx-auto cursor-pointer"
              onClick={onBack} style={{ backgroundColor: ACCENT_TINT, borderRadius: "10px" }}>
              <Layers size={14} style={{ color: ACCENT }} />
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <button onClick={onBack} className="flex items-center gap-1 text-xs mb-3 transition-colors hover:opacity-70 focus:outline-none"
                style={{ color: TEXT_SECONDARY }}>
                <ChevronLeft size={12} />내 프로젝트
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: ACCENT_TINT, borderRadius: "10px" }}>
                  <Layers size={14} style={{ color: ACCENT }} />
                </div>
                <span className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: TEXT_PRIMARY }}>
                  {project.name}
                </span>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-1.5 py-3 space-y-px overflow-y-auto">
          {nav.map(item => {
            const active = page === item.id;
            const btn = (
              <button key={item.id} onClick={() => setPage(item.id)}
                className="w-full flex items-center gap-2.5 text-sm text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                style={{ borderRadius: "12px", padding: collapsed ? "8px" : "7px 12px", justifyContent: collapsed ? "center" : undefined, backgroundColor: active ? ACCENT_TINT : "transparent", color: active ? ACCENT : TEXT_SECONDARY, fontWeight: active ? 500 : 400 }}>
                {item.icon}
                {!collapsed && item.label}
              </button>
            );
            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })}
        </nav>

        <div className="px-1.5 pt-2 pb-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <button onClick={() => setCollapsed(v => !v)}
            className="w-full flex items-center justify-center py-1.5 mb-2 transition-colors hover:bg-[#F0F0F2] focus:outline-none"
            style={{ borderRadius: "10px", color: TEXT_SECONDARY }}
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}>
            <ChevronLeft size={14} className="transition-transform duration-200"
              style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>
          <div style={{ borderTop: `1px solid ${BORDER}` }}>
            {!collapsed ? (
              <div className="flex items-center gap-2.5 px-2 pt-2.5">
                <Avatar initial="이" color="#4A6580" size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: TEXT_PRIMARY }}>이주환</p>
                  <p className="text-[11px]" style={{ color: TEXT_SECONDARY }}>프로젝트 생성자</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center pt-2.5"><Avatar initial="이" color="#4A6580" size="sm" /></div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// ─────────────────────────────────────────────
// PROJECTS PAGE — 2-column grid
// ─────────────────────────────────────────────
function ProjectsPage({ projects, tasks, members, onSelect }: {
  projects: Project[]; tasks: Task[]; members: TeamMember[]; onSelect: (p: Project) => void;
}) {
  const [search, setSearch] = useState("");

  const statusStyle: Record<Project["status"], React.CSSProperties> = {
    "진행 중": { backgroundColor: "#EAF1FF", color: "#2E52B0" },
    "시작 전": { backgroundColor: "#EDEDF0", color: "#3A3A44" },
    "완료":    { backgroundColor: "#E8F5EE", color: "#1A6040" },
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[960px] mx-auto px-6 py-7">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-[22px] font-semibold" style={{ color: TEXT_PRIMARY }}>내 프로젝트</h1>
            <p className="text-sm mt-1" style={{ color: TEXT_SECONDARY }}>참여 중인 팀플·공모전 프로젝트를 한눈에 확인하세요.</p>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_SECONDARY }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="프로젝트 검색"
              className="pl-9 pr-4 py-[7px] text-sm outline-none w-44"
              style={{ backgroundColor: BG_SUNKEN, border: `1px solid ${BORDER}`, borderRadius: "12px", color: TEXT_PRIMARY }} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: TEXT_SECONDARY }}>검색 결과가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(project => {
              const progress = calcProgress(project.id, tasks);
              const projectMembers = members.filter(m => project.memberIds.includes(m.id));
              return (
                <button key={project.id} onClick={() => onSelect(project)}
                  className="w-full text-left bg-white group transition-shadow hover:shadow-[0_3px_10px_rgba(0,0,0,0.06)] focus:outline-none"
                  style={{ border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "16px" }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: ACCENT_TINT, borderRadius: "9px" }}>
                        <Layers size={15} style={{ color: ACCENT }} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-[14px] font-semibold leading-snug group-hover:opacity-80 truncate" style={{ color: TEXT_PRIMARY }}>
                          {project.name}
                        </h2>
                        <p className="text-xs mt-0.5 truncate" style={{ color: TEXT_SECONDARY }}>{project.description}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-[3px] flex-shrink-0 ml-2"
                      style={{ ...statusStyle[project.status], borderRadius: "6px" }}>
                      {project.status}
                    </span>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-2" style={{ color: TEXT_SECONDARY }}>
                      <span>진행률</span>
                      <Mono className="font-medium" style={{ color: TEXT_PRIMARY } as React.CSSProperties}>{progress}%</Mono>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#EBEBEA" }}>
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: ACCENT }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {projectMembers.map(m => <Avatar key={m.id} initial={m.initial} color={m.color} size="sm" />)}
                    </div>
                    <Mono className="text-xs" style={{ color: TEXT_SECONDARY } as React.CSSProperties}>{project.period}</Mono>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────
function DashboardPage({ tasks, notes, resources, project, members, setPage }: {
  tasks: Task[]; notes: Note[]; resources: Resource[]; project: Project; members: TeamMember[]; setPage: (p: Page) => void;
}) {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.status === "완료").length;
  const inProg    = tasks.filter(t => t.status === "진행 중").length;
  const inReview  = tasks.filter(t => t.status === "검토 중").length;
  const notStart  = tasks.filter(t => t.status === "시작 전").length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [teamOpen,   setTeamOpen]   = useState(true);
  const [noteOpen,   setNoteOpen]   = useState(true);
  const [resOpen,    setResOpen]    = useState(true);

  const latestNote = notes[0] ?? null;
  const cardStyle = { border: `1px solid ${BORDER}`, borderRadius: "20px" };
  const projectMembers = members.filter(m => project.memberIds.includes(m.id));

  const PRIORITY: Record<TaskStatus, number> = { "진행 중": 0, "검토 중": 1, "시작 전": 2, "완료": 3 };
  const dashboardTasks = [...tasks].sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status]);

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F4F2" }}>
      <div className="max-w-[1040px] mx-auto px-6 py-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs mb-1" style={{ color: TEXT_SECONDARY }}>내 프로젝트</p>
            <h1 className="text-[22px] font-semibold" style={{ color: TEXT_PRIMARY }}>{project.name}</h1>
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 mt-2.5"
              style={{ backgroundColor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "8px", color: TEXT_SECONDARY }}>
              <Calendar size={10} style={{ opacity: 0.5 }} />
              <Mono>{project.period}</Mono>
            </span>
          </div>
          <button onClick={() => setPage("tasks")} className={btnPrimary}
            style={{ backgroundColor: ACCENT, borderRadius: "12px", marginTop: "4px" }}>
            <Plus size={14} />새 할 일
          </button>
        </div>

        {/* Progress strip */}
        <section className="bg-white mb-4 overflow-hidden" style={cardStyle}>
          <div className="flex items-center gap-4 px-5 py-3.5">
            <Mono className="text-[22px] font-medium leading-none flex-shrink-0" style={{ color: TEXT_PRIMARY }}>{pct}%</Mono>
            <div className="flex-1 min-w-0">
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#EBEBEA" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
              </div>
            </div>
            <Mono className="text-xs flex-shrink-0" style={{ color: TEXT_SECONDARY }}>완료 {completed}/{total}</Mono>
            <div className="w-px h-5 flex-shrink-0" style={{ backgroundColor: BORDER }} />
            <span className="text-xs flex-shrink-0" style={{ color: TEXT_SECONDARY }}>남은 {total - completed}개</span>
            <div className="w-px h-5 flex-shrink-0" style={{ backgroundColor: BORDER }} />
            <span className="text-xs flex-shrink-0" style={{ color: TEXT_SECONDARY }}>진행 {inProg} · 검토 {inReview} · 대기 {notStart}</span>
            <button type="button" onClick={() => setIsTaskOpen(v => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 flex-shrink-0 transition-colors hover:bg-[#F0F0F2] focus:outline-none"
              style={{ color: TEXT_SECONDARY, borderRadius: "8px", marginLeft: "auto" }}>
              {isTaskOpen ? "접기" : "펼치기"}
              <ChevronDown size={13} className={`transition-transform duration-200 ${isTaskOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          {isTaskOpen && (
            <div style={{ borderTop: `1px solid ${BORDER}` }}>
              <div className="grid grid-cols-2 divide-x" style={{ borderColor: BORDER }}>
                {tasks.map(task => {
                  const sc = STATUS_CONFIG[task.status];
                  return (
                    <button key={task.id} type="button" onClick={() => setPage("tasks")}
                      className="flex items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-[#FAFAF8] focus:outline-none"
                      style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <span className="min-w-0 flex-1 text-sm truncate" style={{ color: TEXT_PRIMARY }}>{task.title}</span>
                      <Mono className="text-[11px] flex-shrink-0" style={{ color: TEXT_SECONDARY }}>{task.dueDate}</Mono>
                      <span className="text-[11px] px-2 py-0.5 flex-shrink-0" style={{ backgroundColor: sc.bg, color: sc.fg, borderRadius: "6px" }}>{task.status}</span>
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => setPage("tasks")}
                className="w-full py-2.5 text-xs font-medium transition-colors hover:bg-[#FAFAF8] focus:outline-none"
                style={{ color: TEXT_SECONDARY }}>
                할 일 관리에서 전체 보기 →
              </button>
            </div>
          )}
        </section>

        <div className="grid grid-cols-3 gap-4 items-stretch">
          {/* Task table — stretches to match right column height */}
          <div className="col-span-2 bg-white flex flex-col" style={{ ...cardStyle, padding: 0 }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <h3 className="text-[15px] font-semibold" style={{ color: TEXT_PRIMARY }}>우선 할 일</h3>
              <button onClick={() => setPage("tasks")} className="text-xs font-medium flex items-center gap-0.5 transition-opacity hover:opacity-70 focus:outline-none" style={{ color: ACCENT }}>
                전체 보기 <ChevronRight size={12} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: BG_SUNKEN }}>
                    {["할 일", "담당자", "마감", "상태"].map(h => (
                      <th key={h} className={`py-3 text-left text-[11px] font-semibold uppercase tracking-wider ${h === "할 일" ? "px-6" : "px-4"}`} style={{ color: TEXT_SECONDARY }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboardTasks.map((task, i) => {
                    const m = members.find(m => m.name === task.assignee);
                    return (
                      <tr key={task.id} className="transition-colors hover:bg-[#FAFAF8] cursor-pointer"
                        style={{ borderBottom: i < dashboardTasks.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                        <td className="px-6 py-3.5 text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{task.title}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {m && <Avatar initial={m.initial} color={m.color} size="sm" />}
                            <span className="text-xs" style={{ color: TEXT_SECONDARY }}>{task.assignee}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><Mono className="text-xs" style={{ color: TEXT_SECONDARY } as React.CSSProperties}>{task.dueDate}</Mono></td>
                        <td className="px-4 py-3.5"><StatusBadge status={task.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: "auto" }}>
              <button onClick={() => setPage("tasks")} className="w-full py-2.5 text-xs font-medium transition-colors hover:bg-[#FAFAF8] focus:outline-none" style={{ color: TEXT_SECONDARY }}>
                할 일 관리에서 전체 보기 →
              </button>
            </div>
          </div>

          {/* Right panels */}
          <div className="space-y-3">
            <div className="bg-white overflow-hidden" style={cardStyle}>
              <button className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#FAFAF8] focus:outline-none" onClick={() => setTeamOpen(v => !v)}>
                <h3 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>팀원</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: TEXT_SECONDARY }}>{projectMembers.length}명</span>
                  <ChevronDown size={13} className={`transition-transform duration-200 ${teamOpen ? "rotate-180" : ""}`} style={{ color: TEXT_SECONDARY }} />
                </div>
              </button>
              {teamOpen && (
                <div className="px-4 pb-3 space-y-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <div className="pt-2.5 space-y-2">
                    {projectMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-2.5">
                        <div className="relative flex-shrink-0">
                          <Avatar initial={m.initial} color={m.color} size="sm" />
                          {m.isAI && <span className="absolute -bottom-0.5 -right-0.5 w-[13px] h-[13px] rounded-full flex items-center justify-center" style={{ backgroundColor: "#6B4CA8" }}><Sparkles size={7} className="text-white" /></span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate" style={{ color: TEXT_PRIMARY }}>{m.name}</p>
                          <p className="text-[11px] truncate" style={{ color: TEXT_SECONDARY }}>{m.role}</p>
                        </div>
                        {m.isAI && <span className="text-[10px] font-semibold px-1.5 py-0.5 flex-shrink-0" style={{ backgroundColor: "#EDE9F7", color: "#6B4CA8", borderRadius: "6px" }}>AI</span>}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setPage("team")} className="text-xs font-medium w-full text-center pt-1 transition-opacity hover:opacity-70 focus:outline-none" style={{ color: ACCENT }}>전체 보기</button>
                </div>
              )}
            </div>

            {latestNote && (
              <div className="bg-white overflow-hidden" style={cardStyle}>
                <button className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#FAFAF8] focus:outline-none" onClick={() => setNoteOpen(v => !v)}>
                  <h3 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>공유 노트</h3>
                  <div className="flex items-center gap-2">
                    <Mono className="text-[11px]" style={{ color: TEXT_SECONDARY }}>{latestNote.updatedAt}</Mono>
                    <ChevronDown size={13} className={`transition-transform duration-200 ${noteOpen ? "rotate-180" : ""}`} style={{ color: TEXT_SECONDARY }} />
                  </div>
                </button>
                {noteOpen && (
                  <div style={{ borderTop: `1px solid ${BORDER}` }}>
                    <button className="w-full text-left px-4 py-3 transition-colors hover:bg-[#FAFAF8] focus:outline-none" onClick={() => setPage("notes")}>
                      <p className="text-sm font-medium truncate mb-1" style={{ color: TEXT_PRIMARY }}>{latestNote.title}</p>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: TEXT_SECONDARY }}>
                        {latestNote.content.replace(/[#*`>\-\n]/g, " ").replace(/\s+/g, " ").trim()}
                      </p>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white overflow-hidden" style={cardStyle}>
              <button className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#FAFAF8] focus:outline-none" onClick={() => setResOpen(v => !v)}>
                <h3 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>자료</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: TEXT_SECONDARY }}>{resources.length}개</span>
                  <ChevronDown size={13} className={`transition-transform duration-200 ${resOpen ? "rotate-180" : ""}`} style={{ color: TEXT_SECONDARY }} />
                </div>
              </button>
              {resOpen && (
                <div className="px-4 pb-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <div className="pt-2.5 space-y-1.5">
                    {resources.slice(0, 3).map(r => (
                      <div key={r.id} className="flex items-center gap-2.5 py-1">
                        <ResourceIcon type={r.type} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate" style={{ color: TEXT_PRIMARY }}>{r.name}</p>
                          <Mono className="text-[11px]" style={{ color: TEXT_SECONDARY } as React.CSSProperties}>{r.date}</Mono>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setPage("resources")} className="text-xs font-medium w-full text-center pt-2.5 transition-opacity hover:opacity-70 focus:outline-none" style={{ color: ACCENT }}>전체 보기</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADD TASK MODAL
// ─────────────────────────────────────────────
function AddTaskModal({ onClose, onSubmit, members }: {
  onClose: () => void;
  onSubmit: (task: Omit<Task, "id" | "projectId">) => void;
  members: TeamMember[];
}) {
  const [title,       setTitle]       = useState("");
  const [assignee,    setAssignee]    = useState(members[0]?.name ?? "");
  const [dueDate,     setDueDate]     = useState("");
  const [status,      setStatus]      = useState<TaskStatus>("시작 전");
  const [description, setDescription] = useState("");
  const [errors,      setErrors]      = useState<{ title?: string; dueDate?: string }>({});

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const canSubmit = title.trim().length > 0 && dueDate.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = "할 일 제목을 입력해 주세요.";
    if (!dueDate)      errs.dueDate = "마감일을 선택해 주세요.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const d = new Date(dueDate);
    const fmt = `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    onSubmit({ title: title.trim(), assignee, dueDate: fmt, status, description: description.trim() || undefined });
  }

  const inputStyle: React.CSSProperties = { backgroundColor: BG_SUNKEN, border: `1px solid ${BORDER}`, borderRadius: "12px", color: TEXT_PRIMARY, outline: "none", width: "100%", padding: "9px 14px", fontSize: "14px" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 500, color: TEXT_PRIMARY, marginBottom: "6px" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(28,28,30,0.35)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div className="relative bg-white w-full max-w-[440px] overflow-hidden" style={{ borderRadius: "20px", boxShadow: "0 12px 28px rgba(28,28,30,0.12)" }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <h2 className="text-[15px] font-semibold" style={{ color: TEXT_PRIMARY }}>새 할 일 추가</h2>
          <IconBtn onClick={onClose} label="닫기"><X size={15} /></IconBtn>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label style={labelStyle}>할 일 제목 <span style={{ color: "#A3323A" }}>*</span></label>
            <input type="text" value={title} onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: undefined })); }}
              placeholder="할 일을 입력하세요"
              style={{ ...inputStyle, borderColor: errors.title ? "#A3323A" : BORDER }} />
            {errors.title && <p className="text-xs mt-1" style={{ color: "#A3323A" }}>{errors.title}</p>}
          </div>
          <div>
            <label style={labelStyle}>담당자 <span style={{ color: "#A3323A" }}>*</span></label>
            <div className="relative">
              <select value={assignee} onChange={e => setAssignee(e.target.value)}
                style={{ ...inputStyle, appearance: "none", cursor: "pointer", paddingRight: "36px" }}>
                {members.map(m => <option key={m.id} value={m.name}>{m.name}{m.isAI ? " (AI)" : ""}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: TEXT_SECONDARY }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>마감일 <span style={{ color: "#A3323A" }}>*</span></label>
            <input type="date" value={dueDate} onChange={e => { setDueDate(e.target.value); setErrors(p => ({ ...p, dueDate: undefined })); }}
              style={{ ...inputStyle, borderColor: errors.dueDate ? "#A3323A" : BORDER, fontFamily: "'JetBrains Mono', monospace" }} />
            {errors.dueDate && <p className="text-xs mt-1" style={{ color: "#A3323A" }}>{errors.dueDate}</p>}
          </div>
          <div>
            <label style={labelStyle}>진행 상태 <span style={{ color: "#A3323A" }}>*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {(["시작 전", "진행 중", "검토 중", "완료"] as TaskStatus[]).map(s => {
                const c = STATUS_CONFIG[s]; const sel = status === s;
                return (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-all focus:outline-none"
                    style={{ borderRadius: "12px", border: sel ? `1.5px solid ${c.fg}` : `1px solid ${BORDER}`, backgroundColor: sel ? c.bg : "#FFFFFF", color: sel ? c.fg : TEXT_SECONDARY }}>
                    <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ backgroundColor: sel ? c.dot : "#C8C8CC" }} />{s}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={labelStyle}>설명 <span className="font-normal" style={{ color: TEXT_SECONDARY, fontSize: "12px" }}>(선택)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="간단한 설명을 입력하세요" rows={2}
              style={{ ...inputStyle, resize: "none", lineHeight: "1.6" }} />
          </div>
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium transition-colors hover:bg-[#EAEAEA] focus:outline-none"
              style={{ backgroundColor: "#F0F0F2", borderRadius: "12px", color: TEXT_PRIMARY }}>취소</button>
            <button type="submit" disabled={!canSubmit}
              className="flex-1 py-2.5 text-sm font-medium text-white focus:outline-none"
              style={{ backgroundColor: ACCENT, borderRadius: "12px", opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? "pointer" : "not-allowed" }}>
              할 일 추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TASK DETAIL MODAL
// ─────────────────────────────────────────────
function TaskDetailModal({ task, onClose, members }: { task: Task; onClose: () => void; members: TeamMember[] }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const member = members.find(m => m.name === task.assignee);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(28,28,30,0.35)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div className="relative bg-white w-full max-w-[480px] overflow-hidden flex flex-col"
        style={{ borderRadius: "20px", boxShadow: "0 12px 28px rgba(28,28,30,0.12)", maxHeight: "90vh" }}>
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3">
            <h2 className="text-[16px] font-semibold" style={{ color: TEXT_PRIMARY }}>할 일 상세</h2>
            <StatusBadge status={task.status} />
          </div>
          <IconBtn onClick={onClose} label="닫기"><X size={15} /></IconBtn>
        </div>
        <div className="px-6 py-6 overflow-y-auto space-y-6">
          <h3 className="text-[18px] font-semibold leading-snug" style={{ color: TEXT_PRIMARY }}>{task.title}</h3>
          <div className="space-y-4" style={{ backgroundColor: BG_SUNKEN, padding: "16px", borderRadius: "12px", border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium w-12" style={{ color: TEXT_SECONDARY }}>담당자</span>
              {member ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar initial={member.initial} color={member.color} size="sm" />
                    {member.isAI && <span className="absolute -bottom-0.5 -right-0.5 w-[13px] h-[13px] rounded-full flex items-center justify-center" style={{ backgroundColor: "#6B4CA8" }}><Sparkles size={7} className="text-white" /></span>}
                  </div>
                  <span className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{task.assignee}</span>
                </div>
              ) : (
                <span className="text-sm" style={{ color: TEXT_PRIMARY }}>{task.assignee}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium w-12" style={{ color: TEXT_SECONDARY }}>마감일</span>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} style={{ color: TEXT_SECONDARY }} />
                <Mono className="text-sm">{task.dueDate}</Mono>
              </div>
            </div>
          </div>
          <div>
            <span className="text-xs font-medium block mb-2" style={{ color: TEXT_SECONDARY }}>설명</span>
            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: task.description ? TEXT_PRIMARY : TEXT_SECONDARY }}>
              {task.description || "설명이 없습니다."}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 flex justify-end flex-shrink-0" style={{ borderTop: `1px solid ${BORDER}`, backgroundColor: "#FAFAF8" }}>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium transition-colors hover:bg-[#EAEAEA] focus:outline-none"
            style={{ backgroundColor: "#F0F0F2", borderRadius: "12px", color: TEXT_PRIMARY }}>닫기</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TASKS PAGE — no calendar tab, clickable filters, scroll reset
// ─────────────────────────────────────────────
function TasksPage({ tasks, setTasks, projectId = "1", members, title = "할 일 관리", subtitle }: {
  tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>; projectId?: string;
  members: TeamMember[]; title?: string; subtitle?: string;
}) {
  const [view,         setView]         = useState<TaskView>("목록");
  const [showModal,    setShowModal]    = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newId,        setNewId]        = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("전체");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [view]);

  const baseFiltered = tasks
    .filter(t => filterStatus === "전체" || t.status === filterStatus)
    .filter(t =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      t.assignee.toLowerCase().includes(search.toLowerCase())
    );

  const counts: Record<FilterStatus, number> = {
    전체: tasks.length,
    "시작 전": tasks.filter(t => t.status === "시작 전").length,
    "진행 중": tasks.filter(t => t.status === "진행 중").length,
    "검토 중": tasks.filter(t => t.status === "검토 중").length,
    완료: tasks.filter(t => t.status === "완료").length,
  };

  function handleAdd(task: Omit<Task, "id" | "projectId">) {
    const id = Date.now().toString();
    setTasks(prev => [{ ...task, id, projectId, isNew: true }, ...prev]);
    setNewId(id);
    setShowModal(false);
    setTimeout(() => {
      setNewId(null);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, isNew: false } : t));
    }, 2500);
  }

  const statGroups: Array<{ label: FilterStatus; bg: string; fg: string }> = [
    { label: "전체",   bg: "#F0F2F7", fg: ACCENT       },
    { label: "시작 전", bg: "#F3F3F5", fg: "#38383F"   },
    { label: "진행 중", bg: "#EEF3FF", fg: "#2A4CA0"   },
    { label: "검토 중", bg: "#FFF8EC", fg: "#6B3E00"   },
    { label: "완료",   bg: "#EDF8F2", fg: "#175538"   },
  ];

  const cardStyle = { border: `1px solid ${BORDER}`, borderRadius: "20px" };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F4F2" }}>
      <div className="max-w-[1040px] mx-auto px-6 py-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            {subtitle && <p className="text-xs mb-1" style={{ color: TEXT_SECONDARY }}>{subtitle}</p>}
            <h1 className="text-[22px] font-semibold" style={{ color: TEXT_PRIMARY }}>{title}</h1>
          </div>
          <button onClick={() => setShowModal(true)} className={btnPrimary} style={{ backgroundColor: ACCENT, borderRadius: "12px" }}>
            <Plus size={14} />새 할 일
          </button>
        </div>

        {/* Clickable filter stat cards */}
        <div className="grid grid-cols-5 gap-2.5 mb-5">
          {statGroups.map(s => {
            const active = filterStatus === s.label;
            return (
              <button key={s.label} type="button" onClick={() => setFilterStatus(s.label)}
                className="px-4 py-3.5 text-left transition-all focus:outline-none"
                style={{ borderRadius: "16px", backgroundColor: s.bg, border: active ? `2px solid ${s.fg}` : "2px solid transparent", cursor: "pointer" }}>
                <p className="text-xs mb-1" style={{ color: s.fg, opacity: 0.75 }}>{s.label}</p>
                <Mono className="text-[26px] font-medium block leading-none" style={{ color: s.fg }}>
                  {counts[s.label]}
                </Mono>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-0.5 bg-white p-1" style={{ border: `1px solid ${BORDER}`, borderRadius: "14px" }}>
            {(["목록", "보드"] as TaskView[]).map(v => (
              <button key={v} onClick={() => setView(v)} className="px-4 py-1.5 text-sm font-medium transition-all focus:outline-none"
                style={{ borderRadius: "10px", backgroundColor: view === v ? ACCENT : "transparent", color: view === v ? "#FFFFFF" : TEXT_SECONDARY }}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {filterStatus !== "전체" && (
              <button onClick={() => setFilterStatus("전체")}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 transition-colors hover:opacity-70 focus:outline-none"
                style={{ backgroundColor: STATUS_CONFIG[filterStatus as TaskStatus]?.bg ?? ACCENT_TINT, color: STATUS_CONFIG[filterStatus as TaskStatus]?.fg ?? ACCENT, borderRadius: "8px" }}>
                {filterStatus} <X size={11} />
              </button>
            )}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_SECONDARY }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="할 일 검색"
                className="pl-9 pr-4 py-[7px] text-sm outline-none w-40"
                style={{ backgroundColor: BG_SUNKEN, border: `1px solid ${BORDER}`, borderRadius: "12px", color: TEXT_PRIMARY }} />
            </div>
          </div>
        </div>

        {/* List view */}
        {view === "목록" && (
          <div className="bg-white overflow-hidden" style={{ ...cardStyle, padding: 0 }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: BG_SUNKEN }}>
                  {["할 일 제목", "담당자", "마감일", "진행 상태"].map(h => (
                    <th key={h} className={`py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider ${h === "할 일 제목" ? "px-6" : "px-4"}`} style={{ color: TEXT_SECONDARY }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {baseFiltered.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-10 text-sm text-center" style={{ color: TEXT_SECONDARY }}>검색 결과가 없습니다.</td></tr>
                )}
                {baseFiltered.map((task, i) => {
                  const m = members.find(m => m.name === task.assignee);
                  const hi = task.id === newId;
                  return (
                    <tr key={task.id} onClick={() => setSelectedTask(task)} className="transition-colors cursor-pointer"
                      style={{ borderBottom: i < baseFiltered.length - 1 ? `1px solid ${BORDER}` : "none", backgroundColor: hi ? "#EAF1FF" : undefined }}
                      onMouseEnter={e => { if (!hi) (e.currentTarget as HTMLElement).style.backgroundColor = BG_SUNKEN; }}
                      onMouseLeave={e => { if (!hi) (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{task.title}</span>
                          {hi && <span className="text-[10px] font-bold text-white px-2 py-0.5" style={{ backgroundColor: "#3860C9", borderRadius: "6px" }}>NEW</span>}
                        </div>
                        {task.description && <p className="text-xs mt-0.5" style={{ color: TEXT_SECONDARY }}>{task.description}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {m && (
                            <div className="relative">
                              <Avatar initial={m.initial} color={m.color} size="sm" />
                              {m.isAI && <span className="absolute -bottom-0.5 -right-0.5 w-[13px] h-[13px] rounded-full flex items-center justify-center" style={{ backgroundColor: "#6B4CA8" }}><Sparkles size={7} className="text-white" /></span>}
                            </div>
                          )}
                          <span className="text-sm" style={{ color: TEXT_SECONDARY }}>{task.assignee}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4"><Mono className="text-sm" style={{ color: TEXT_SECONDARY } as React.CSSProperties}>{task.dueDate}</Mono></td>
                      <td className="px-4 py-4"><StatusBadge status={task.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Board view */}
        {view === "보드" && (
          <div className="grid grid-cols-4 gap-4">
            {(["시작 전", "진행 중", "검토 중", "완료"] as TaskStatus[]).map(status => {
              const c = STATUS_CONFIG[status];
              const groupTasks = baseFiltered.filter(t => t.status === status);
              return (
                <div key={status} className="bg-white overflow-hidden" style={{ ...cardStyle, padding: 0 }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: c.bg }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.dot }} />
                      <span className="text-sm font-semibold" style={{ color: c.fg }}>{status}</span>
                    </div>
                    <Mono className="text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
                      style={{ backgroundColor: c.bg, color: c.fg, border: `1px solid ${c.dot}30` }}>{groupTasks.length}</Mono>
                  </div>
                  <div className="p-3 space-y-2.5">
                    {groupTasks.map(task => {
                      const m = members.find(m => m.name === task.assignee);
                      const hi = task.id === newId;
                      return (
                        <div key={task.id} onClick={() => setSelectedTask(task)} className="transition-shadow cursor-pointer"
                          style={{ backgroundColor: hi ? "#EAF1FF" : "#FFFFFF", border: hi ? `1.5px solid #3860C9` : `1px solid ${BORDER}`, borderRadius: "16px", padding: "14px" }}>
                          <p className="text-sm font-medium mb-2.5 leading-snug" style={{ color: TEXT_PRIMARY }}>{task.title}</p>
                          {task.description && <p className="text-xs mb-2" style={{ color: TEXT_SECONDARY }}>{task.description}</p>}
                          <div className="flex items-center justify-between">
                            {m ? (
                              <div className="relative">
                                <Avatar initial={m.initial} color={m.color} size="sm" />
                                {m.isAI && <span className="absolute -bottom-0.5 -right-0.5 w-[13px] h-[13px] rounded-full flex items-center justify-center" style={{ backgroundColor: "#6B4CA8" }}><Sparkles size={7} className="text-white" /></span>}
                              </div>
                            ) : <div />}
                            <Mono className="text-xs ml-auto" style={{ color: TEXT_SECONDARY } as React.CSSProperties}>{task.dueDate}</Mono>
                          </div>
                        </div>
                      );
                    })}
                    {groupTasks.length === 0 && <div className="py-8 text-center text-xs" style={{ color: "#C0C0C8" }}>할 일 없음</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <AddTaskModal onClose={() => setShowModal(false)} onSubmit={handleAdd} members={members} />}
      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} members={members} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// TEAM PAGE
// ─────────────────────────────────────────────
function TeamPage({ tasks, members, projects, onAddMember, hideAdd = false, showProjectChips = false, title = "팀원 관리", subtitle }: {
  tasks: Task[]; members: TeamMember[]; projects?: Project[]; onAddMember?: () => void;
  hideAdd?: boolean; showProjectChips?: boolean; title?: string; subtitle?: string;
}) {
  const cardStyle = { border: `1px solid ${BORDER}`, borderRadius: "20px" };

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F4F2" }}>
      <div className="max-w-[860px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            {subtitle && <p className="text-xs mb-1" style={{ color: TEXT_SECONDARY }}>{subtitle}</p>}
            <h1 className="text-[22px] font-semibold" style={{ color: TEXT_PRIMARY }}>{title}</h1>
          </div>
          {!hideAdd && onAddMember && (
            <button onClick={onAddMember} className={btnPrimary} style={{ backgroundColor: ACCENT, borderRadius: "12px" }}>
              <Plus size={14} />팀원 추가
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {members.map(member => {
            const memberTasks = tasks.filter(t => t.assignee === member.name);
            const memberProjects = projects?.filter(p => p.memberIds.includes(member.id)) ?? [];
            return (
              <div key={member.id} className="bg-white transition-shadow hover:shadow-[0_3px_10px_rgba(0,0,0,0.06)]"
                style={{ ...cardStyle, padding: "16px", borderRadius: "12px", borderColor: member.isAI ? "#D6C8F0" : BORDER }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative">
                    <Avatar initial={member.initial} color={member.color} size="lg" />
                    {member.isAI && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: "#6B4CA8" }}>
                        <Sparkles size={9} className="text-white" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-[15px] font-semibold" style={{ color: TEXT_PRIMARY }}>{member.name}</h3>
                      {member.isAI && (
                        <span className="text-[10px] font-bold px-2 py-0.5" style={{ backgroundColor: "#EDE9F7", color: "#6B4CA8", borderRadius: "6px" }}>AI</span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: TEXT_SECONDARY }}>{member.role}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-3" style={{ color: TEXT_SECONDARY }}>{member.description}</p>

                {/* Project chips — home view only */}
                {showProjectChips && memberProjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {memberProjects.map(p => (
                      <span key={p.id} className="text-[11px] font-medium px-2 py-1 max-w-[180px] truncate"
                        style={{ backgroundColor: ACCENT_TINT, color: ACCENT, borderRadius: "6px" }}>
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}

                <Divider />
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs" style={{ color: TEXT_SECONDARY }}>담당 할 일</span>
                    <span className="text-sm font-semibold" style={{ color: member.isAI ? "#6B4CA8" : ACCENT }}>{memberTasks.length}개</span>
                  </div>
                  {memberTasks.slice(0, 2).map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="text-xs truncate" style={{ color: TEXT_SECONDARY }}>{t.title}</span>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MARKDOWN RENDERER
// ─────────────────────────────────────────────
function mdToHtml(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;

  function inline(s: string) {
    return s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, `<code style="font-family:'JetBrains Mono',monospace;background:#F0F0F2;padding:1px 5px;border-radius:4px;font-size:0.82em">$1</code>`);
  }

  function closeList() {
    if (listType) { out.push(`</${listType}>`); listType = null; }
  }

  for (const raw of lines) {
    const line = raw;
    if (/^### /.test(line)) { closeList(); out.push(`<h3 style="font-size:14px;font-weight:600;margin:16px 0 6px;color:${TEXT_PRIMARY}">${inline(line.replace(/^### /, ""))}</h3>`); }
    else if (/^## /.test(line)) { closeList(); out.push(`<h2 style="font-size:16px;font-weight:600;margin:20px 0 8px;color:${TEXT_PRIMARY}">${inline(line.replace(/^## /, ""))}</h2>`); }
    else if (/^# /.test(line)) { closeList(); out.push(`<h1 style="font-size:20px;font-weight:700;margin:24px 0 10px;color:${TEXT_PRIMARY}">${inline(line.replace(/^# /, ""))}</h1>`); }
    else if (/^> /.test(line)) { closeList(); out.push(`<blockquote style="border-left:3px solid ${BORDER};padding:4px 0 4px 14px;color:${TEXT_SECONDARY};margin:10px 0;font-style:italic">${inline(line.replace(/^> /, ""))}</blockquote>`); }
    else if (/^\d+\. /.test(line)) { if (listType !== "ol") { closeList(); out.push('<ol style="padding-left:20px;margin:8px 0">'); listType = "ol"; } out.push(`<li style="margin:4px 0;color:${TEXT_PRIMARY}">${inline(line.replace(/^\d+\. /, ""))}</li>`); }
    else if (/^[-*] /.test(line)) { if (listType !== "ul") { closeList(); out.push('<ul style="padding-left:20px;margin:8px 0">'); listType = "ul"; } out.push(`<li style="margin:4px 0;color:${TEXT_PRIMARY}">${inline(line.replace(/^[-*] /, ""))}</li>`); }
    else if (line.trim() === "") { closeList(); out.push(`<div style="height:8px"></div>`); }
    else { closeList(); out.push(`<p style="margin:4px 0;line-height:1.75;color:${TEXT_PRIMARY}">${inline(line)}</p>`); }
  }
  closeList();
  return out.join("");
}

// ─────────────────────────────────────────────
// NOTE TEMPLATE PICKER
// ─────────────────────────────────────────────
function NoteTemplatePicker({ onSelect, onClose }: {
  onSelect: (tpl: typeof NOTE_TEMPLATES[number]) => void; onClose: () => void;
}) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const icons: Record<string, React.ReactNode> = {
    blank: <FileText size={16} />, plan: <Layers size={16} />, decision: <CheckSquare size={16} />,
    research: <Search size={16} />, meeting: <Users size={16} />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(28,28,30,0.35)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div className="relative bg-white w-full max-w-[360px] overflow-hidden" style={{ borderRadius: "20px", boxShadow: "0 12px 28px rgba(28,28,30,0.12)" }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <h2 className="text-[15px] font-semibold" style={{ color: TEXT_PRIMARY }}>템플릿 선택</h2>
          <IconBtn onClick={onClose} label="닫기"><X size={15} /></IconBtn>
        </div>
        <div className="px-4 py-3 space-y-1">
          {NOTE_TEMPLATES.map(tpl => (
            <button key={tpl.id} onClick={() => onSelect(tpl)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F4F4F2] focus:outline-none"
              style={{ borderRadius: "12px" }}>
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ACCENT_TINT, color: ACCENT, borderRadius: "8px" }}>
                {icons[tpl.id]}
              </div>
              <span className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{tpl.label}</span>
            </button>
          ))}
        </div>
        <div className="pb-3" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// NOTES PAGE — preview read-only, toolbar hidden, auto-save status
// ─────────────────────────────────────────────
function NotesPage({ notes, setNotes, projectId }: {
  notes: Note[]; setNotes: React.Dispatch<React.SetStateAction<Note[]>>; projectId: string;
}) {
  const projectNotes = notes.filter(n => n.projectId === projectId);
  const [activeId,      setActiveId]      = useState<string | null>(projectNotes[0]?.id ?? null);
  const [preview,       setPreview]       = useState(false);
  const [search,        setSearch]        = useState("");
  const [showTplPicker, setShowTplPicker] = useState(false);
  const [saveStatus,    setSaveStatus]    = useState<"saved" | "saving" | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeNote = notes.find(n => n.id === activeId) ?? null;

  function updateNote(patch: Partial<Note>) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    setNotes(prev => prev.map(n => n.id === activeId ? { ...n, ...patch, updatedAt: "07.14" } : n));
    saveTimerRef.current = setTimeout(() => setSaveStatus("saved"), 900);
  }

  function addFromTemplate(tpl: typeof NOTE_TEMPLATES[number]) {
    const id = Date.now().toString();
    const titleMap: Record<string, string> = { blank: "제목 없음", plan: "기획 문서", decision: "결정 기록", research: "조사 노트", meeting: "회의 정리" };
    setNotes(prev => [{ id, projectId, title: titleMap[tpl.id] ?? "제목 없음", content: tpl.content, updatedAt: "07.14", author: "이주환" }, ...prev]);
    setActiveId(id);
    setPreview(false);
    setShowTplPicker(false);
  }

  function insertAtCursor(before: string, after = "") {
    const el = textareaRef.current;
    if (!el || !activeNote) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const sel   = activeNote.content.slice(start, end);
    const next  = activeNote.content.slice(0, start) + before + sel + after + activeNote.content.slice(end);
    updateNote({ content: next });
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd   = start + before.length + sel.length;
    });
  }

  const filtered = projectNotes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const TOOLBAR: Array<{ icon: React.ReactNode; tip: string; before: string; after?: string }> = [
    { icon: <Heading1 size={14} />, tip: "제목 1", before: "\n# "  },
    { icon: <Heading2 size={14} />, tip: "제목 2", before: "\n## " },
    { icon: <Bold size={14} />,     tip: "굵게",   before: "**", after: "**" },
    { icon: <Italic size={14} />,   tip: "기울기", before: "*",  after: "*"  },
    { icon: <List size={14} />,     tip: "목록",   before: "\n- " },
    { icon: <Code size={14} />,     tip: "코드",   before: "`",  after: "`"  },
  ];

  return (
    <div className="flex-1 flex overflow-hidden" style={{ backgroundColor: "#F4F4F2" }}>
      {/* List pane */}
      <div className="w-[272px] flex-shrink-0 flex flex-col" style={{ backgroundColor: "#fff", borderRight: `1px solid ${BORDER}` }}>
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>공유 노트</h2>
            <IconBtn onClick={() => setShowTplPicker(true)} label="새 노트 만들기"><Plus size={15} /></IconBtn>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: TEXT_SECONDARY }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="노트 검색"
              className="w-full pl-8 pr-3 py-1.5 text-xs outline-none"
              style={{ backgroundColor: BG_SUNKEN, border: `1px solid ${BORDER}`, borderRadius: "8px", color: TEXT_PRIMARY }} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-px">
          {filtered.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: TEXT_SECONDARY }}>
              {projectNotes.length === 0 ? "노트가 없습니다" : "검색 결과 없음"}
            </p>
          )}
          {filtered.map(note => {
            const active = note.id === activeId;
            const author = INITIAL_TEAM_MEMBERS.find(m => m.name === note.author);
            const snippet = note.content.split("\n").find(l => l.trim() && !/^[#>\-*]/.test(l))?.replace(/[*`]/g, "").slice(0, 30) ?? "";
            return (
              <button key={note.id} onClick={() => { setActiveId(note.id); setPreview(false); }} className="w-full text-left px-3 py-2.5 transition-colors focus:outline-none"
                style={{ borderRadius: "12px", backgroundColor: active ? ACCENT_TINT : "transparent" }}>
                <p className="text-sm font-medium truncate mb-0.5" style={{ color: active ? ACCENT : TEXT_PRIMARY }}>{note.title || "제목 없음"}</p>
                <div className="flex items-center gap-1.5">
                  {author && <Avatar initial={author.initial} color={author.color} size="sm" />}
                  <Mono className="text-[11px] flex-shrink-0" style={{ color: TEXT_SECONDARY }}>{note.updatedAt}</Mono>
                  {snippet && <p className="text-[11px] truncate" style={{ color: TEXT_SECONDARY }}>{snippet}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor pane */}
      {activeNote ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar — edit mode only */}
          {!preview && (
            <div className="flex items-center justify-between px-6 py-2 bg-white flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-0.5">
                {TOOLBAR.map(t => (
                  <button key={t.tip} title={t.tip} aria-label={t.tip} onClick={() => insertAtCursor(t.before, t.after ?? "")}
                    className="w-7 h-7 flex items-center justify-center transition-colors hover:bg-[#F0F0F2] focus:outline-none"
                    style={{ borderRadius: "6px", color: TEXT_SECONDARY }}>
                    {t.icon}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {saveStatus && (
                  <span className="text-[11px]" style={{ color: saveStatus === "saved" ? "#1A6040" : TEXT_SECONDARY }}>
                    {saveStatus === "saved" ? "저장됨" : "저장 중…"}
                  </span>
                )}
                <button onClick={() => setPreview(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F0F0F2] focus:outline-none"
                  style={{ borderRadius: "8px", color: TEXT_SECONDARY }}>
                  <Eye size={13} />미리보기
                </button>
              </div>
            </div>
          )}

          {/* Preview mode minimal bar */}
          {preview && (
            <div className="flex items-center justify-between px-6 py-2 bg-white flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <span className="text-xs px-2.5 py-1 font-medium" style={{ backgroundColor: ACCENT_TINT, color: ACCENT, borderRadius: "8px" }}>미리보기</span>
              <button onClick={() => setPreview(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F0F0F2] focus:outline-none"
                style={{ borderRadius: "8px", color: TEXT_SECONDARY }}>
                <PenLine size={13} />편집으로 돌아가기
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-5" style={{ backgroundColor: "#F4F4F2" }}>
            <div className="max-w-[720px] mx-auto bg-white" style={{ border: `1px solid ${BORDER}`, borderRadius: "20px", overflow: "hidden" }}>
              {/* Title row */}
              <div className="px-7 pt-6 pb-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                {preview ? (
                  <h1 className="text-[22px] font-semibold" style={{ color: TEXT_PRIMARY }}>{activeNote.title || "제목 없음"}</h1>
                ) : (
                  <input type="text" value={activeNote.title} onChange={e => updateNote({ title: e.target.value })}
                    placeholder="제목 없음"
                    className="w-full text-[22px] font-semibold bg-transparent outline-none"
                    style={{ color: TEXT_PRIMARY }} />
                )}
                <div className="flex items-center gap-2.5 mt-2">
                  {(() => { const a = INITIAL_TEAM_MEMBERS.find(m => m.name === activeNote.author); return a ? <Avatar initial={a.initial} color={a.color} size="sm" /> : null; })()}
                  <Mono className="text-xs" style={{ color: TEXT_SECONDARY }}>{activeNote.updatedAt}</Mono>
                </div>
              </div>
              {/* Body */}
              <div className="px-7 py-5" style={{ minHeight: "380px" }}>
                {preview ? (
                  <div className="text-sm" style={{ color: TEXT_PRIMARY, lineHeight: "1.75" }}
                    dangerouslySetInnerHTML={{ __html: mdToHtml(activeNote.content) }} />
                ) : (
                  <textarea ref={textareaRef} value={activeNote.content} onChange={e => updateNote({ content: e.target.value })}
                    placeholder={`# 제목\n\n내용을 자유롭게 입력하세요.\n\n- **굵게** *기울기*\n- ## 소제목\n- \`코드\`\n- > 인용문`}
                    className="w-full resize-none outline-none text-sm leading-relaxed bg-transparent"
                    style={{ color: TEXT_PRIMARY, minHeight: "400px", fontFamily: "'Pretendard', sans-serif" }} />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: "#F4F4F2" }}>
          <div className="text-center">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#F0F0F2", borderRadius: "16px" }}>
              <FileText size={22} style={{ color: "#C0C0C8" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: TEXT_SECONDARY }}>노트를 선택하거나 새로 만드세요</p>
            <button onClick={() => setShowTplPicker(true)} className={`${btnPrimary} mt-4 mx-auto`} style={{ backgroundColor: ACCENT, borderRadius: "12px" }}>
              <Plus size={14} />새 노트
            </button>
          </div>
        </div>
      )}

      {showTplPicker && <NoteTemplatePicker onSelect={addFromTemplate} onClose={() => setShowTplPicker(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// RESOURCES PAGE
// ─────────────────────────────────────────────
function ResourcesPage({ resources, onAddResource }: { resources: Resource[]; onAddResource: () => void }) {
  const [search, setSearch] = useState("");

  const filtered = resources.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
    r.owner.toLowerCase().includes(search.toLowerCase())
  );

  const cardStyle = { border: `1px solid ${BORDER}`, borderRadius: "20px", padding: 0 };

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F4F2" }}>
      <div className="max-w-[860px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs mb-1" style={{ color: TEXT_SECONDARY }}>자료실</p>
            <h1 className="text-[22px] font-semibold" style={{ color: TEXT_PRIMARY }}>자료실</h1>
          </div>
          <button onClick={onAddResource} className={btnPrimary} style={{ backgroundColor: ACCENT, borderRadius: "12px" }}>
            <Plus size={14} />자료 추가
          </button>
        </div>

        <div className="bg-white overflow-hidden" style={cardStyle}>
          <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <Search size={13} style={{ color: TEXT_SECONDARY, flexShrink: 0 }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="자료실에서 검색"
              className="flex-1 text-sm bg-transparent outline-none" style={{ color: TEXT_PRIMARY }} />
            {["유형", "수정일"].map(label => (
              <button key={label} className="flex items-center gap-1 text-xs px-3 py-1.5 transition-colors focus:outline-none"
                style={{ backgroundColor: "#F0F0F2", borderRadius: "8px", color: TEXT_SECONDARY }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#E8E8EA"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F0F0F2"}>
                {label} <ChevronDown size={11} />
              </button>
            ))}
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: BG_SUNKEN }}>
                {["이름", "소유자", "수정일", "유형"].map(h => (
                  <th key={h} className={`py-3 text-left text-[11px] font-semibold uppercase tracking-wider ${h === "이름" ? "px-6" : "px-4"}`} style={{ color: TEXT_SECONDARY }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-10 text-sm text-center" style={{ color: TEXT_SECONDARY }}>
                  {resources.length === 0 ? "자료가 없습니다." : "검색 결과가 없습니다."}
                </td></tr>
              )}
              {filtered.map((r, i) => (
                <tr key={r.id} className="transition-colors cursor-pointer"
                  style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : "none" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = BG_SUNKEN}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ""}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <ResourceIcon type={r.type} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{r.name}</p>
                        {r.description && <p className="text-xs mt-0.5" style={{ color: TEXT_SECONDARY }}>{r.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm" style={{ color: TEXT_SECONDARY }}>{r.owner}</td>
                  <td className="px-4 py-4"><Mono className="text-sm" style={{ color: TEXT_SECONDARY } as React.CSSProperties}>{r.date}</Mono></td>
                  <td className="px-4 py-4">
                    <span className="text-xs px-2 py-1" style={{ backgroundColor: "#F0F0F2", color: TEXT_SECONDARY, borderRadius: "8px" }}>{r.type}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AI PAGE
// ─────────────────────────────────────────────
function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" onClick={onChange} aria-label={label}
      className="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      style={{ backgroundColor: on ? ACCENT : "#D1D1D6" }}>
      <span className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: on ? "translateX(18px)" : "translateX(2px)" }} />
    </button>
  );
}

interface AIHistoryItem { id: string; title: string; result: string; date: string; status: "검토 대기" | "반영됨" | "반려됨"; }

function AIPage({ tasks, setTasks, projectId = "1" }: { tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>; projectId?: string }) {
  const ai = INITIAL_TEAM_MEMBERS.find(m => m.isAI)!;
  const aiTasks = tasks.filter(t => t.assignee === ai.name);

  const [instructions, setInstructions] = useState(
    "너는 팀플 관리 웹서비스 프로젝트의 자료조사 담당 AI 팀원이야.\n\n역할: 팀원이 요청하는 자료를 조사하고 정리해서 공유 노트에 기록해줘.\n\n작업 원칙:\n- 항상 출처를 명시할 것\n- 3개 이상의 참고 자료를 비교해서 정리할 것\n- 결과물은 마크다운 형식으로 작성할 것\n- 팀원 검토 전에는 자동으로 반영하지 않을 것"
  );
  const [briefTitle,   setBriefTitle]   = useState("");
  const [briefContent, setBriefContent] = useState("");
  const [briefSent,    setBriefSent]    = useState(false);
  const [ctx, setCtx] = useState({ project: true, notes: true, resources: true, tasks: true, team: false });

  const [history] = useState<AIHistoryItem[]>([
    { id: "h1", title: "유사 서비스 레퍼런스 조사",  result: "Notion, Linear, Trello 비교 분석 완료. 공유 노트에 정리함.", date: "07.11", status: "반영됨" },
    { id: "h2", title: "대학생 팀플 페인포인트 조사", result: "설문 결과 5개 패턴 도출. 검토 요청 중.", date: "07.10", status: "검토 대기" },
    { id: "h3", title: "경쟁사 기능 비교표 작성",    result: "초안 제출했으나 기준이 부적합하여 재작업 예정.", date: "07.08", status: "반려됨" },
  ]);

  const histStyle: Record<AIHistoryItem["status"], React.CSSProperties> = {
    "검토 대기": { backgroundColor: "#FFF4D8", color: "#8A5A00" },
    "반영됨":    { backgroundColor: "#E8F5EE", color: "#22704A" },
    "반려됨":    { backgroundColor: "#F0F0F2", color: "#5C5C66" },
  };

  const cardStyle = { border: `1px solid ${BORDER}`, borderRadius: "20px" };
  const inp: React.CSSProperties = { backgroundColor: BG_SUNKEN, border: `1px solid ${BORDER}`, borderRadius: "12px", color: TEXT_PRIMARY, outline: "none", width: "100%", padding: "9px 14px", fontSize: "13px" };
  const canSubmit = briefTitle.trim().length > 0;

  function handleBriefSend(e: React.FormEvent) {
    e.preventDefault();
    if (!briefTitle.trim()) return;
    const id = Date.now().toString();
    setTasks(prev => [{ id, projectId, title: briefTitle.trim(), assignee: ai.name, dueDate: "07.20", status: "시작 전", description: briefContent.trim() || undefined }, ...prev]);
    setBriefTitle(""); setBriefContent(""); setBriefSent(true);
    setTimeout(() => setBriefSent(false), 3000);
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F4F2" }}>
      <div className="max-w-[1040px] mx-auto px-6 py-6">
        <div className="mb-4">
          <p className="text-xs mb-1" style={{ color: TEXT_SECONDARY }}>AI 팀원 관리</p>
          <h1 className="text-[22px] font-semibold" style={{ color: TEXT_PRIMARY }}>AI 에이전트 관리</h1>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            {/* Profile */}
            <div className="bg-white p-5" style={cardStyle}>
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <Avatar initial="AI" color="#6B4CA8" size="lg" />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#6B4CA8" }}>
                    <Sparkles size={9} className="text-white" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-0.5">
                    <h2 className="text-[15px] font-semibold" style={{ color: TEXT_PRIMARY }}>{ai.name}</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5" style={{ backgroundColor: "#EDE9F7", color: "#6B4CA8", borderRadius: "6px" }}>AI 팀원</span>
                  </div>
                  <p className="text-sm" style={{ color: TEXT_SECONDARY }}>{ai.role}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#22704A" }} />
                  <span className="text-xs" style={{ color: "#22704A" }}>대기 중</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { label: "배정된 할 일", val: aiTasks.length,                                          unit: "개" },
                  { label: "진행 중",     val: aiTasks.filter(t => t.status === "진행 중").length,       unit: "개" },
                  { label: "작업 이력",   val: history.length,                                           unit: "건" },
                ].map(s => (
                  <div key={s.label} className="px-4 py-3" style={{ backgroundColor: "#F5F2FB", borderRadius: "12px" }}>
                    <p className="text-[11px] mb-0.5" style={{ color: "#9B87CC" }}>{s.label}</p>
                    <div className="flex items-baseline gap-1">
                      <Mono className="text-[22px] font-medium leading-none" style={{ color: "#6B4CA8" }}>{s.val}</Mono>
                      <span className="text-xs" style={{ color: "#9B87CC" }}>{s.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Role instructions */}
            <div className="bg-white overflow-hidden" style={cardStyle}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <h3 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>역할 지시사항</h3>
                <span className="text-[10px] font-medium px-2 py-0.5" style={{ backgroundColor: "#F5F5F7", color: TEXT_SECONDARY, borderRadius: "6px", border: `1px solid ${BORDER}` }}>수정 가능</span>
              </div>
              <div className="px-5 py-4">
                <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
                  className="w-full resize-none outline-none text-sm leading-relaxed overflow-hidden"
                  style={{ ...inp, fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", padding: "12px 14px", lineHeight: "1.7", minHeight: "auto", height: "auto", rows: undefined } as React.CSSProperties}
                  onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }} />
                <div className="flex justify-end mt-2.5">
                  <button className={btnPrimary} style={{ backgroundColor: ACCENT, borderRadius: "10px", padding: "7px 16px", fontSize: "12px" }}>저장</button>
                </div>
              </div>
            </div>

            {/* Tasks */}
            <div className="bg-white overflow-hidden" style={{ ...cardStyle, padding: 0 }}>
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <h3 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>배정된 할 일</h3>
                <span className="text-xs font-medium px-2.5 py-1" style={{ backgroundColor: "#EDE9F7", color: "#6B4CA8", borderRadius: "8px" }}>{aiTasks.length}개</span>
              </div>
              {aiTasks.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: BG_SUNKEN }}>
                      {["할 일", "마감", "상태"].map(h => (
                        <th key={h} className={`py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider ${h === "할 일" ? "px-5" : "px-3"}`} style={{ color: TEXT_SECONDARY }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aiTasks.map((task, i) => (
                      <tr key={task.id} style={{ borderBottom: i < aiTasks.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{task.title}</p>
                          {task.description && <p className="text-xs mt-0.5" style={{ color: TEXT_SECONDARY }}>{task.description}</p>}
                        </td>
                        <td className="px-3 py-3"><Mono className="text-xs" style={{ color: TEXT_SECONDARY }}>{task.dueDate}</Mono></td>
                        <td className="px-3 py-3"><StatusBadge status={task.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-center py-8" style={{ color: TEXT_SECONDARY }}>배정된 할 일이 없습니다.</p>
              )}
            </div>

            {/* Brief form */}
            <div className="bg-white p-5" style={cardStyle}>
              <h3 className="text-sm font-semibold mb-1" style={{ color: TEXT_PRIMARY }}>새 작업 브리핑</h3>
              <p className="text-xs mb-4" style={{ color: TEXT_SECONDARY }}>AI 팀원에게 맡길 작업을 상세하게 작성하세요.</p>
              {briefSent ? (
                <div className="flex items-center justify-center gap-2 py-6" style={{ backgroundColor: "#E8F5EE", borderRadius: "12px" }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#22704A" }}>✓</span>
                  <p className="text-sm font-medium" style={{ color: "#22704A" }}>작업 요청이 전달됐습니다</p>
                </div>
              ) : (
                <form onSubmit={handleBriefSend} className="space-y-3">
                  <input type="text" value={briefTitle} onChange={e => setBriefTitle(e.target.value)}
                    placeholder="작업 제목 (예: 경쟁 서비스 기능 비교 정리)" style={inp} />
                  <textarea value={briefContent} onChange={e => setBriefContent(e.target.value)}
                    placeholder={"작업 지시사항을 구체적으로 작성하세요.\n\n예:\n- 조사 대상: Notion, Linear, Trello, Asana\n- 비교 항목: 할 일 관리, 팀원 역할, 대시보드\n- 출력 형식: 마크다운 비교표"}
                    rows={5} style={{ ...inp, resize: "none", lineHeight: "1.65", fontFamily: "'Pretendard', sans-serif" }} />
                  <div className="flex items-center justify-between">
                    <p className="text-[11px]" style={{ color: TEXT_SECONDARY }}>활성화된 컨텍스트를 함께 전달합니다</p>
                    <button type="submit" disabled={!canSubmit}
                      className={btnPrimary}
                      style={{ backgroundColor: ACCENT, borderRadius: "10px", padding: "8px 18px", opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? "pointer" : "not-allowed" }}>
                      <Sparkles size={13} />작업 요청
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div className="bg-white p-5" style={cardStyle}>
              <h3 className="text-sm font-semibold mb-0.5" style={{ color: TEXT_PRIMARY }}>컨텍스트 설정</h3>
              <p className="text-[11px] mb-4" style={{ color: TEXT_SECONDARY }}>AI가 작업 시 참조할 정보를 선택하세요</p>
              <div className="space-y-3">
                {([
                  { key: "project",   label: "프로젝트 목표 · 설명", desc: "기본 컨텍스트" },
                  { key: "notes",     label: "공유 노트 참고",        desc: "팀 노트 전체" },
                  { key: "resources", label: "자료실 링크",           desc: "첨부 파일 제외" },
                  { key: "tasks",     label: "할 일 목록",            desc: "현재 상태 포함" },
                  { key: "team",      label: "팀원 정보",             desc: "이름·역할" },
                ] as const).map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium" style={{ color: TEXT_PRIMARY }}>{item.label}</p>
                      <p className="text-[11px]" style={{ color: TEXT_SECONDARY }}>{item.desc}</p>
                    </div>
                    <Toggle on={ctx[item.key]} onChange={() => setCtx(p => ({ ...p, [item.key]: !p[item.key] }))} label={`${item.label} 토글`} />
                  </div>
                ))}
              </div>
              <div className="mt-4 px-3 py-2.5" style={{ backgroundColor: BG_SUNKEN, borderRadius: "10px", border: `1px solid ${BORDER}` }}>
                <p className="text-[11px]" style={{ color: TEXT_SECONDARY }}>활성화된 항목 {Object.values(ctx).filter(Boolean).length}개가 브리핑 시 함께 전달됩니다.</p>
              </div>
            </div>

            <div className="bg-white overflow-hidden" style={cardStyle}>
              <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <h3 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>작업 이력</h3>
              </div>
              <div className="divide-y" style={{ borderColor: BORDER }}>
                {history.map(h => (
                  <div key={h.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-medium leading-snug" style={{ color: TEXT_PRIMARY }}>{h.title}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 flex-shrink-0" style={{ ...histStyle[h.status], borderRadius: "6px" }}>{h.status}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: TEXT_SECONDARY }}>{h.result}</p>
                    <Mono className="text-[11px]" style={{ color: TEXT_SECONDARY }}>{h.date}</Mono>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4" style={{ backgroundColor: BG_SUNKEN, border: `1px solid ${BORDER}`, borderRadius: "12px" }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} style={{ color: TEXT_SECONDARY }} />
                <h3 className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>에이전트 동작 방식</h3>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                작업 요청 → 역할 지시사항 + 컨텍스트 참조 → 결과물 작성 → 검토 대기 → 팀원 승인 후 반영. 결과물은 자동으로 적용되지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MY TASKS PAGE
// ─────────────────────────────────────────────
function MyTasksPage({ tasks, projects, members }: { tasks: Task[]; projects: Project[]; members: TeamMember[] }) {
  const myTasks = tasks.filter(t => t.assignee === "이주환");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const groups = projects.map(p => ({
    project: p,
    tasks: myTasks.filter(t => t.projectId === p.id)
  })).filter(g => g.tasks.length > 0);

  const cardStyle = { border: `1px solid ${BORDER}`, borderRadius: "12px" };

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F4F2" }}>
      <div className="max-w-[860px] mx-auto px-6 py-6">
        <div className="mb-5">
          <p className="text-xs mb-1" style={{ color: TEXT_SECONDARY }}>모든 프로젝트 · 통합 관리</p>
          <h1 className="text-[22px] font-semibold" style={{ color: TEXT_PRIMARY }}>내 할 일</h1>
        </div>

        <div className="space-y-6">
          {groups.map(g => (
            <div key={g.project.id} className="bg-white overflow-hidden" style={cardStyle}>
              <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: BG_SUNKEN }}>
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ACCENT_TINT, borderRadius: "8px" }}>
                  <Layers size={14} style={{ color: ACCENT }} />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold" style={{ color: TEXT_PRIMARY }}>{g.project.name}</h2>
                  <p className="text-xs" style={{ color: TEXT_SECONDARY }}>{g.tasks.length}개의 배정된 할 일</p>
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEXT_SECONDARY }}>할 일 제목</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEXT_SECONDARY }}>마감일</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEXT_SECONDARY }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {g.tasks.map((task, i) => (
                    <tr key={task.id} onClick={() => setSelectedTask(task)}
                      className="transition-colors cursor-pointer hover:bg-[#FAFAF8]"
                      style={{ borderBottom: i < g.tasks.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{task.title}</span>
                        {task.description && <p className="text-xs mt-0.5 truncate max-w-[300px]" style={{ color: TEXT_SECONDARY }}>{task.description}</p>}
                      </td>
                      <td className="px-4 py-4"><Mono className="text-sm" style={{ color: TEXT_SECONDARY } as React.CSSProperties}>{task.dueDate}</Mono></td>
                      <td className="px-4 py-4"><StatusBadge status={task.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {groups.length === 0 && <div className="py-12 text-center text-sm" style={{ color: TEXT_SECONDARY }}>배정된 내 할 일이 없습니다.</div>}
        </div>
      </div>
      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} members={members} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
export default function App() {
  const [appMode,         setAppMode]         = useState<"home" | "project">("home");
  const [homePage,        setHomePage]        = useState<"projects" | "tasks" | "team">("projects");
  const [selectedProject, setSelectedProject] = useState<Project>(INITIAL_PROJECTS[0]);
  const [page,            setPage]            = useState<Page>("dashboard");
  const [tasks,           setTasks]           = useState<Task[]>(INITIAL_TASKS);
  const [notes,           setNotes]           = useState<Note[]>(INITIAL_NOTES);
  const [projects,        setProjects]        = useState<Project[]>(INITIAL_PROJECTS);
  const [members,         setMembers]         = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  const [resources,       setResources]       = useState<Resource[]>(INITIAL_RESOURCES);

  const [showNewProject,  setShowNewProject]  = useState(false);
  const [showAddMember,   setShowAddMember]   = useState(false);
  const [showAddResource, setShowAddResource] = useState(false);

  function openProject(project: Project) {
    setSelectedProject(project);
    setPage("dashboard");
    setAppMode("project");
  }

  function handleNewProject(p: Omit<Project, "id" | "creatorId" | "memberIds">) {
    const id = Date.now().toString();
    setProjects(prev => [...prev, { ...p, id, creatorId: "1", memberIds: ["1"] }]);
    setShowNewProject(false);
  }

  function handleAddMember(m: Omit<TeamMember, "id">) {
    const id = Date.now().toString();
    setMembers(prev => [...prev, { ...m, id }]);
    setProjects(prev => prev.map(p =>
      p.id === selectedProject.id ? { ...p, memberIds: [...p.memberIds, id] } : p
    ));
    setSelectedProject(prev => ({ ...prev, memberIds: [...prev.memberIds, id] }));
    setShowAddMember(false);
  }

  function handleAddResource(r: Omit<Resource, "id" | "projectId">) {
    const id = Date.now().toString();
    setResources(prev => [...prev, { ...r, id, projectId: selectedProject.id }]);
    setShowAddResource(false);
  }

  const projectTasks     = tasks.filter(t => t.projectId === selectedProject.id);
  const projectNotes     = notes.filter(n => n.projectId === selectedProject.id);
  const projectResources = resources.filter(r => r.projectId === selectedProject.id);
  const projectMembers   = members.filter(m => selectedProject.memberIds.includes(m.id));

  return (
    <>
    <style>{`*:focus:not(:focus-visible){outline:none!important;box-shadow:none!important;}`}</style>
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F4F4F2" }}>
      {appMode === "home" ? (
        <>
          <HomeSidebar page={homePage} setPage={setHomePage} onNewProject={() => setShowNewProject(true)} />
          {homePage === "projects" && <ProjectsPage projects={projects} tasks={tasks} members={members} onSelect={openProject} />}
          {homePage === "tasks"    && <MyTasksPage  tasks={tasks} projects={projects} members={members} />}
          {homePage === "team"     && (
            <TeamPage tasks={tasks} members={members} projects={projects} hideAdd showProjectChips title="전체 팀원" subtitle="모든 프로젝트 · 통합 관리" />
          )}
        </>
      ) : (
        <>
          <ProjectSidebar page={page} setPage={setPage} onBack={() => setAppMode("home")} project={selectedProject} />
          {page === "dashboard" && (
            <DashboardPage tasks={projectTasks} notes={projectNotes} resources={projectResources}
              project={selectedProject} members={members} setPage={setPage} />
          )}
          {page === "tasks" && (
            <TasksPage tasks={projectTasks} setTasks={setTasks} projectId={selectedProject.id}
              members={projectMembers} subtitle={`${selectedProject.name} · 할 일`} />
          )}
          {page === "team" && (
            <TeamPage tasks={projectTasks} members={projectMembers} projects={projects}
              onAddMember={() => setShowAddMember(true)} subtitle={`${selectedProject.name} · 팀원`} />
          )}
          {page === "notes"     && <NotesPage     notes={notes} setNotes={setNotes} projectId={selectedProject.id} />}
          {page === "resources" && <ResourcesPage resources={projectResources} onAddResource={() => setShowAddResource(true)} />}
          {page === "ai"        && <AIPage        tasks={projectTasks} setTasks={setTasks} projectId={selectedProject.id} />}
        </>
      )}

      {showNewProject  && <NewProjectModal  onClose={() => setShowNewProject(false)}  onSubmit={handleNewProject} />}
      {showAddMember   && <AddMemberModal   onClose={() => setShowAddMember(false)}   onSubmit={handleAddMember} existingMembers={members} />}
      {showAddResource && <AddResourceModal onClose={() => setShowAddResource(false)} onSubmit={handleAddResource} />}
    </div>
    </>
  );
}
