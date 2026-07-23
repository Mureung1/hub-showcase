// screens/HomeScreen.jsx
import { useEffect, useState } from "react";
import "./HomeScreen.css";
import PrimaryButton from "../components/PrimaryButton";
import Badge from "../components/Badge";
import TimeTableGrid from "../components/TimeTableGrid";
import { fetchSharedTimetables, recommendTimetable } from "../api/timetables";

const CATEGORY_ORDER = ["전공필수", "전공선택", "교양"];

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

// 카드별 추천 상태: idle | recommending | done | error
function initialRecommendState(sharedTimetables) {
  return Object.fromEntries(
    sharedTimetables.map((tt) => [
      tt.id,
      { status: tt.recommendedByMe ? "done" : "idle", count: tt.recommendCount },
    ])
  );
}

export default function HomeScreen({ userName = "학생", onNavigate, onLogout }) {
  const [status, setStatus] = useState("loading"); // loading | empty | done | error
  const [sharedTimetables, setSharedTimetables] = useState([]);
  const [recommendState, setRecommendState] = useState({});

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchSharedTimetables()
      .then((data) => {
        if (cancelled) return;
        setSharedTimetables(data);
        setRecommendState(initialRecommendState(data));
        setStatus(data.length > 0 ? "done" : "empty");
      })
      .catch((err) => {
        console.error("선배 시간표 조회 실패:", err);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRecommend(id) {
    setRecommendState((prev) => ({ ...prev, [id]: { ...prev[id], status: "recommending" } }));
    try {
      const result = await recommendTimetable({ timetableId: id });
      setRecommendState((prev) => ({ ...prev, [id]: { status: "done", count: result.recommendCount } }));
    } catch (err) {
      console.error("시간표 추천 실패:", err);
      setRecommendState((prev) => ({ ...prev, [id]: { ...prev[id], status: "error" } }));
    }
  }

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

        {status === "loading" && <p className="home-screen__status">불러오는 중...</p>}

        {status === "error" && (
          <p className="home-screen__status">선배 시간표를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
        )}

        {status === "empty" && <p className="home-screen__status">아직 공유된 선배 시간표가 없어요</p>}

        {status === "done" && (
          <div className="senior-list">
            {sharedTimetables.map((tt) => {
              const totalCredit = tt.lectures.reduce((sum, l) => sum + l.credit, 0);
              const categorySummary = summarizeByCategory(tt.lectures);
              const { status: recommendStatus, count: recommendCount } = recommendState[tt.id];

              return (
                <div key={tt.id} className="senior-card">
                  <div className="senior-card__header">
                    <p className="senior-card__title">{tt.label}</p>
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
                    <TimeTableGrid lectures={tt.lectures} />
                  </div>

                  <div className="senior-card__recommend">
                    <span className="senior-card__recommend-count">추천 {recommendCount}</span>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => handleRecommend(tt.id)}
                      disabled={recommendStatus === "recommending" || recommendStatus === "done"}
                    >
                      {recommendStatus === "done" ? "추천 완료" : "추천하기"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
