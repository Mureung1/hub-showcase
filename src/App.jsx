import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  HeartPulse,
  Home,
  MapPin,
  Pill,
  Search,
  ShieldCheck,
  Siren,
  Stethoscope,
  Utensils,
} from "lucide-react";

const carePlan = [
  {
    time: "08:20",
    title: "심장약 1/2정 복용",
    meta: "공복 피하기 · 복용 후 20분 관찰",
    status: "완료",
    icon: Pill,
  },
  {
    time: "12:40",
    title: "점심 식사량 기록",
    meta: "수업 이동 전 3분 입력",
    status: "예정",
    icon: Utensils,
  },
  {
    time: "18:10",
    title: "짧은 산책과 호흡 체크",
    meta: "알바 전 15분 · 기침 여부 확인",
    status: "주의",
    icon: HeartPulse,
  },
  {
    time: "22:30",
    title: "배변·배뇨 상태 기록",
    meta: "색, 횟수, 통증 반응 메모",
    status: "예정",
    icon: ClipboardList,
  },
];

const warningSignals = [
  "식사량이 3일 평균보다 38% 낮아요.",
  "어제 밤 기침 기록이 2회 추가됐어요.",
  "다음 내원 전 체중 기록이 비어 있어요.",
];

const nearbyPlaces = [
  { label: "24시 동물병원", value: "1.8km", type: "응급" },
  { label: "반려동물 동반 카페", value: "650m", type: "동반" },
  { label: "보험 청구 가능 병원", value: "2.4km", type: "서류" },
];

const insuranceDocs = ["진료비 영수증", "진료 세부내역서", "처방전 또는 약 봉투", "보험금 청구서"];

const guideCards = [
  {
    title: "길 위 동물 기초 대응",
    body: "무리하게 만지지 않고 거리 확보, 사진 기록, 지역 보호센터 또는 24시 병원 문의 순서로 안내해요.",
    icon: Siren,
  },
  {
    title: "병원 방문 메모 자동 정리",
    body: "최근 식욕, 약 복용, 구토, 배변 기록을 문진표처럼 요약해서 진료 전 설명 부담을 줄여요.",
    icon: Stethoscope,
  },
  {
    title: "육성 정보 검색",
    body: "나이, 질환, 생활 패턴에 맞는 관리 키워드와 확인 질문을 추천해 정보 탐색 시간을 줄여요.",
    icon: Search,
  },
];

function Sidebar() {
  const nav = [
    [Home, "오늘"],
    [HeartPulse, "건강기록"],
    [FileText, "병원리포트"],
    [Siren, "응급가이드"],
    [MapPin, "주변찾기"],
    [ShieldCheck, "보험서류"],
  ];

  return (
    <aside className="sidebar" aria-label="햇살하루 메뉴">
      <div className="brand">
        <span className="brand-mark">햇</span>
        <div>
          <strong>햇살하루</strong>
          <p>후회 방지 펫 케어 Agent</p>
        </div>
      </div>

      <nav className="nav-list">
        {nav.map(([Icon, label], index) => (
          <button className={index === 0 ? "nav-item active" : "nav-item"} key={label}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="help-card">
        <AlertTriangle size={20} />
        <strong>진단이 아닌 기록 보조</strong>
        <p>응급 신호가 보이면 앱 안내보다 수의사 상담을 우선해요.</p>
      </div>
    </aside>
  );
}

function TodayPlan() {
  return (
    <section className="panel main-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">오늘의 케어 플랜</p>
          <h2>수업과 알바 사이, 놓치면 안 되는 돌봄</h2>
        </div>
        <button className="ghost-button">
          전체 일정 <ChevronRight size={16} />
        </button>
      </div>

      <div className="student-schedule">
        <CalendarDays size={18} />
        <div>
          <strong>오늘 일정</strong>
          <span>전공 수업 10:00-12:00 · 팀플 15:00 · 알바 19:00-22:00</span>
        </div>
      </div>

      <div className="timeline">
        {carePlan.map((item) => {
          const Icon = item.icon;
          return (
            <article className="timeline-item" key={`${item.time}-${item.title}`}>
              <time>{item.time}</time>
              <div className="timeline-icon">
                <Icon size={18} />
              </div>
              <div className="timeline-copy">
                <strong>{item.title}</strong>
                <span>{item.meta}</span>
              </div>
              <span className={`status ${item.status}`}>{item.status}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RiskPanel() {
  return (
    <section className="panel risk-panel">
      <div className="pet-profile">
        <div className="pet-avatar">복</div>
        <div>
          <p>복실이 · 9살 · 심장 관리 중</p>
          <strong>최근 7일 관찰 신호</strong>
        </div>
      </div>

      <div className="risk-score">
        <span>주의도</span>
        <strong>72</strong>
        <p>병원 상담 준비 권장</p>
      </div>

      <ul className="warning-list">
        {warningSignals.map((signal) => (
          <li key={signal}>
            <AlertTriangle size={16} />
            {signal}
          </li>
        ))}
      </ul>
    </section>
  );
}

function HospitalReport() {
  return (
    <section className="panel report-panel">
      <div className="section-heading compact">
        <div>
          <p className="section-label">병원에 들고 갈 정보</p>
          <h3>진료 전 요약 리포트</h3>
        </div>
        <button className="primary-button">생성</button>
      </div>
      <div className="report-summary">
        <p>최근 3일간 식사량 감소, 야간 기침 2회, 산책 후 피로 반응이 기록됐어요.</p>
        <div className="report-tags">
          <span>식욕 저하</span>
          <span>기침</span>
          <span>복약 기록 있음</span>
        </div>
      </div>
    </section>
  );
}

function NearbyAndDocs() {
  return (
    <section className="panel split-panel">
      <div>
        <p className="section-label">주변 찾기</p>
        <h3>필요한 장소를 빠르게</h3>
        <div className="place-list">
          {nearbyPlaces.map((place) => (
            <div className="place-row" key={place.label}>
              <MapPin size={16} />
              <strong>{place.label}</strong>
              <span>{place.value}</span>
              <em>{place.type}</em>
            </div>
          ))}
        </div>
      </div>

      <div className="doc-checklist">
        <p className="section-label">보험 청구</p>
        <h3>서류 체크리스트</h3>
        {insuranceDocs.map((doc) => (
          <label key={doc}>
            <CheckCircle2 size={16} />
            {doc}
          </label>
        ))}
      </div>
    </section>
  );
}

function GuideGrid() {
  return (
    <section className="guide-grid" aria-label="햇살하루 주요 기능">
      {guideCards.map((card) => {
        const Icon = card.icon;
        return (
          <article className="guide-card" key={card.title}>
            <Icon size={22} />
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        );
      })}
    </section>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="dashboard">
        <header className="topbar">
          <div>
            <h1>햇살하루</h1>
            <p>대학생 보호자의 일정과 아픈 반려동물의 건강 루틴을 함께 관리해요.</p>
          </div>
          <button className="primary-button">오늘 기록 추가</button>
        </header>

        <div className="dashboard-grid">
          <TodayPlan />
          <RiskPanel />
          <HospitalReport />
          <NearbyAndDocs />
        </div>

        <GuideGrid />
      </main>
    </div>
  );
}
