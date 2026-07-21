// screens/RecommendResultScreen.jsx
import { useEffect, useState } from "react";
import "./RecommendResultScreen.css";
import TimeTableCard from "../components/TimeTableCard";
import TimeTableGrid from "../components/TimeTableGrid";
import { fetchLectures } from "../api/lectures";
import { recommendTimetable } from "../algo/recommendTimetable";
import { CURRENT_YEAR, CURRENT_SEMESTER } from "../config/semester";

export default function RecommendResultScreen({ preferences, onNavigate, onSelect }) {
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | done | error

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    Promise.all([
      fetchLectures({ year: CURRENT_YEAR, semester: CURRENT_SEMESTER, department: preferences.department }),
      fetchLectures({ year: CURRENT_YEAR, semester: CURRENT_SEMESTER, category: "교양" }),
    ])
      .then(([majorLectures, generalLectures]) => {
        if (cancelled) return;
        // 학과 개설 교양처럼 두 조회 결과에 같은 강의가 동시에 걸릴 수 있어 id 기준으로 중복 제거
        const subjectsById = new Map();
        for (const lecture of [...majorLectures, ...generalLectures]) {
          subjectsById.set(lecture.id, lecture);
        }
        setResults(recommendTimetable(preferences, [...subjectsById.values()]));
        setStatus("done");
      })
      .catch((err) => {
        console.error("추천 시간표 계산 실패:", err);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [preferences]);

  function handleSelect(result) {
    onSelect?.({
      lectures: result.lectures,
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

      {status === "loading" && (
        <p className="recommend-result-screen__desc">조건에 맞는 시간표를 계산하고 있어요...</p>
      )}

      {status === "error" && (
        <p className="recommend-result-screen__desc">
          추천 시간표를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
      )}

      {status === "done" && results.length === 0 && (
        <p className="recommend-result-screen__desc">
          조건에 맞는 시간표를 찾지 못했어요. 목표 학점이나 공강 요일 조건을 조정해보세요.
        </p>
      )}

      {status === "done" && results.length > 0 && (
        <>
          <p className="recommend-result-screen__desc">
            입력하신 조건에 맞는 시간표 {results.length}개를 찾았어요. 마음에 드는 시간표를
            선택하면 내 시간표로 확정돼요.
          </p>

          <div className="recommend-result-screen__list">
            {results.map((result) => (
              <TimeTableCard
                key={result.id}
                title={result.label}
                totalCredit={result.totalCredit}
                targetCredit={preferences.targetCredit}
              >
                <TimeTableGrid lectures={result.lectures} />
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => handleSelect(result)}
                >
                  이 시간표 선택하기
                </button>
              </TimeTableCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
