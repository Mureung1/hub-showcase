// screens/HomeScreen.jsx
import "./HomeScreen.css";
import PrimaryButton from "../components/PrimaryButton";
import Badge from "../components/Badge";
import TimeTableGrid from "../components/TimeTableGrid";
import { mockTimetables } from "../data/mockTimetables";
import { mockSubjects } from "../data/mockSubjects";

const CATEGORY_ORDER = ["전공필수", "전공선택", "교양"];

function resolveLectures(lectureIds) {
  return lectureIds
    .map((id) => mockSubjects.find((s) => s.id === id))
    .filter(Boolean);
}

function summarizeByCategory(lectures) {
  const counts = new Map();
  for (const lec of lectures) {
    counts.set(lec.category, (counts.get(lec.category) ?? 0) + 1);
  }
  return CATEGORY_ORDER.filter((c) => counts.has(c)).map((c) => ({
    category: c,
    count: counts.get(c),
  }));
}

export default function HomeScreen({ userName = "학생", onNavigate, onLogout }) {
  return (
    <div className="home-screen">
      <div className="topbar">
        <span className="topbar__back" aria-hidden="true" />
        <h1 className="topbar__title">홈</h1>
        <button
          type="button"
          className="topbar__logout"
          onClick={() => onLogout?.()}
          aria-label="로그아웃"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>

      <div className="home-screen__intro">
        <p className="home-screen__greeting">{userName}님, 안녕하세요</p>
        <p className="home-screen__desc">
          선배들이 공유한 시간표를 참고하고, 내 조건에 맞는 시간표를 추천받아보세요.
        </p>
      </div>

      <PrimaryButton onClick={() => onNavigate?.("preference")}>
        내 조건으로 시간표 추천받기
      </PrimaryButton>

      <div className="home-screen__section">
        <p className="home-screen__section-title">선배들의 시간표</p>
        <p className="home-screen__section-desc">
          신입생이라면 먼저 선배들의 시간표를 둘러보세요. 전공필수/전공선택/교양이 어떻게
          배치되어 있는지 확인할 수 있어요.
        </p>

        <div className="senior-list">
          {mockTimetables.map((tt) => {
            const lectures = resolveLectures(tt.lectureIds);
            const totalCredit = lectures.reduce((sum, l) => sum + l.credit, 0);
            const categorySummary = summarizeByCategory(lectures);

            return (
              <div key={tt.id} className="senior-card">
                <div className="senior-card__header">
                  <div>
                    <p className="senior-card__title">{tt.title}</p>
                    <p className="senior-card__desc">{tt.description}</p>
                  </div>
                  <Badge>{tt.grade}학년 선배</Badge>
                </div>

                <div className="senior-card__badges">
                  <Badge variant="success">총 {totalCredit}학점</Badge>
                  {categorySummary.map(({ category, count }) => (
                    <Badge key={category}>
                      {category} {count}개
                    </Badge>
                  ))}
                </div>

                <div className="senior-card__grid-wrap">
                  <TimeTableGrid lectures={lectures} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
