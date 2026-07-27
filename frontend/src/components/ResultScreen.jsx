import { useState } from "react";
import PriorityBadge from "./PriorityBadge";
import WeightSelector from "./WeightSelector";
import ScoreBreakdown from "./ScoreBreakdown";
import SubjectDetailFields from "./SubjectDetailFields";
import StudyPlan from "./StudyPlan";
import Chevron from "./Chevron";
import { getDaysUntil, formatDday } from "../utils/daysUntil";
import { buildPriorityReason } from "../utils/priorityReason";
import { formatScale } from "../utils/scaleLabels";
import { toggleInSet } from "../utils/toggleSet";

const THIS_WEEK_DAYS = 7;

function ResultScreen({
  subjects,
  weightKey,
  onChangeWeight,
  planHours,
  onChangePlanHours,
  onUpdateSubject,
  onCompleteSubject,
  onBack,
}) {
  const [sortKey, setSortKey] = useState("score");
  const [onlyThisWeek, setOnlyThisWeek] = useState(false);
  // 점수 분해 막대는 기본적으로 숨겨두고, 눌러서 펼친 과목만 보여준다.
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  // 추가 입력도 마찬가지로, 더 정확하게 하고 싶은 과목만 펼친다.
  const [detailIds, setDetailIds] = useState(() => new Set());

  const filteredSubjects = onlyThisWeek
    ? subjects.filter((subject) => {
        const daysUntil = getDaysUntil(subject.examDate);
        return daysUntil !== null && daysUntil <= THIS_WEEK_DAYS;
      })
    : subjects;

  const rankedSubjects = [...filteredSubjects].sort((a, b) => {
    if (sortKey === "dday") {
      const daysA = getDaysUntil(a.examDate);
      const daysB = getDaysUntil(b.examDate);

      // 시험일을 입력하지 않은 과목은 항상 맨 뒤로 보낸다.
      if (daysA === null && daysB === null) {
        return b.priorityScore - a.priorityScore;
      }
      if (daysA === null) {
        return 1;
      }
      if (daysB === null) {
        return -1;
      }

      return daysA - daysB;
    }
    return b.priorityScore - a.priorityScore;
  });

  // 추천 과목은 필터와 무관하게 항상 점수 1위 과목으로 고른다.
  const recommendedSubject = [...subjects].sort(
    (a, b) => b.priorityScore - a.priorityScore
  )[0];

  return (
    <section>
      {recommendedSubject ? (
        <div className="recommend-card">
          <p className="recommend-eyebrow">오늘의 추천 과목</p>
          <h2 className="recommend-name">{recommendedSubject.name}</h2>
          <p className="recommend-score">
            우선순위 점수 {recommendedSubject.priorityScore}점 ·{" "}
            {formatDday(getDaysUntil(recommendedSubject.examDate))}
          </p>
          <p className="recommend-reason">
            {buildPriorityReason(recommendedSubject, weightKey)}
          </p>
        </div>
      ) : (
        <div className="empty-state">
          <p>등록된 과목이 없어요. 과목을 담고 다시 확인해 주세요.</p>
        </div>
      )}

      {subjects.length > 0 && (
        <StudyPlan
          subjects={subjects}
          hours={planHours}
          onChangeHours={onChangePlanHours}
        />
      )}

      <WeightSelector value={weightKey} onChange={onChangeWeight} />

      <div className="result-toolbar">
        <div className="sort-toggle" role="group" aria-label="정렬 기준">
          <button
            type="button"
            className={`chip${sortKey === "score" ? " is-selected" : ""}`}
            aria-pressed={sortKey === "score"}
            onClick={() => setSortKey("score")}
          >
            점수순
          </button>
          <button
            type="button"
            className={`chip${sortKey === "dday" ? " is-selected" : ""}`}
            aria-pressed={sortKey === "dday"}
            onClick={() => setSortKey("dday")}
          >
            D-day순
          </button>
        </div>

        <label className="filter-check">
          <input
            type="checkbox"
            checked={onlyThisWeek}
            onChange={(event) => setOnlyThisWeek(event.target.checked)}
          />
          이번 주 시험만
        </label>
      </div>

      <h3 className="subsection-title">등록된 과목</h3>

      {rankedSubjects.length > 0 ? (
        <>
          {/* 펼치기 전에 왜 펼치는지 알려준다. 과목마다 반복하면 소음이라 목록 위에 한 번만 둔다. */}
          <p className="list-lead">
            과목마다 &ldquo;더 정확하게&rdquo;를 열어 항목을 채울수록 순위가 정확해져요.
          </p>
          <ul className="subject-list">
          {rankedSubjects.map((subject, index) => {
            const isExpanded = expandedIds.has(subject.id);
            const isDetailOpen = detailIds.has(subject.id);

            return (
              <li key={subject.id} className="subject-item">
                <div className="subject-row">
                  <span className="subject-rank">{index + 1}</span>
                  <div className="subject-main">
                    <span className="subject-name">{subject.name}</span>
                    <span className="subject-meta">
                      {formatDday(getDaysUntil(subject.examDate))} · 이해도{" "}
                      {formatScale(subject.understanding)}
                    </span>
                  </div>
                  <PriorityBadge priorityScore={subject.priorityScore} />
                  <span className="subject-score">{subject.priorityScore}점</span>
                </div>

                <div className="subject-tools">
                  <button
                    type="button"
                    className="link-button"
                    aria-expanded={isExpanded}
                    onClick={() => toggleInSet(setExpandedIds, subject.id)}
                  >
                    점수 구성 <Chevron open={isExpanded} />
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    aria-expanded={isDetailOpen}
                    onClick={() => toggleInSet(setDetailIds, subject.id)}
                  >
                    더 정확하게 <Chevron open={isDetailOpen} />
                  </button>
                  <button
                    type="button"
                    className="entry-action subject-done"
                    onClick={() => onCompleteSubject(subject.id)}
                  >
                    공부 끝
                  </button>
                </div>

                {isExpanded && <ScoreBreakdown subject={subject} />}
                {isDetailOpen && (
                  <SubjectDetailFields subject={subject} onChange={onUpdateSubject} />
                )}
              </li>
            );
          })}
          </ul>
        </>
      ) : (
        <p className="empty-hint">이번 주에 시험이 있는 과목이 없어요.</p>
      )}

      <button type="button" className="button button-secondary" onClick={onBack}>
        ← 과목 다시 담기
      </button>
    </section>
  );
}

export default ResultScreen;
