// screens/RecommendResultScreen.jsx
import "./RecommendResultScreen.css";
import TimeTableCard from "../components/TimeTableCard";
import TimeTableGrid from "../components/TimeTableGrid";
import { mockRecommendResult } from "../data/mockRecommendResult";
import { mockSubjects } from "../data/mockSubjects";

function resolveLectures(lectureIds) {
  return lectureIds
    .map((id) => mockSubjects.find((s) => s.id === id))
    .filter(Boolean);
}

export default function RecommendResultScreen({ preferences, onNavigate, onSelect }) {
  const targetCredit = preferences?.targetCredit ?? mockRecommendResult.targetCredit;

  function handleSelect(result) {
    onSelect?.({
      selectedLectureIds: result.lectureIds,
      selectedLabel: result.label,
    });
  }

  return (
    <div className="recommend-result-screen">
      <div className="topbar">
        <button
          type="button"
          className="topbar__back"
          onClick={() => onNavigate?.("preference")}
          aria-label="뒤로가기"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="topbar__title">추천 결과</h1>
        <span className="topbar__spacer" aria-hidden="true" />
      </div>

      <p className="recommend-result-screen__desc">
        입력하신 조건에 맞는 시간표 {mockRecommendResult.results.length}개를 찾았어요. 마음에 드는
        시간표를 선택하면 내 시간표로 확정돼요.
      </p>

      <div className="recommend-result-screen__list">
        {mockRecommendResult.results.map((result) => {
          const lectures = resolveLectures(result.lectureIds);
          return (
            <TimeTableCard
              key={result.id}
              title={result.label}
              totalCredit={result.totalCredit}
              targetCredit={targetCredit}
            >
              <TimeTableGrid lectures={lectures} />
              <button
                type="button"
                className="ghost-btn"
                onClick={() => handleSelect(result)}
              >
                이 시간표 선택하기
              </button>
            </TimeTableCard>
          );
        })}
      </div>
    </div>
  );
}
