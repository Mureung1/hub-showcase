import { useState } from "react";
import ScoreSelector from "./ScoreSelector";
import SubjectDetailFields from "./SubjectDetailFields";
import Chevron from "./Chevron";
import { getDaysUntil, formatDday } from "../utils/daysUntil";
import { UNDERSTANDING_LEVELS, UNKNOWN } from "../utils/scaleLabels";
import { toggleInSet } from "../utils/toggleSet";

// 2단계. 가중치가 가장 큰 두 요인이 임박도(0.18)와 이해도(0.18)다.
// 날짜는 1단계에서 받았으니 여기서 이해도만 받으면 순위의 큰 줄기가 잡힌다.
//
// 나머지 항목은 "더 자세히"로 접어둔다. 미리 다 채우고 싶은 사람은 여기서 채우고,
// 아닌 사람은 결과를 본 뒤 결과 화면에서 채운다. 둘 다 같은 입력 컴포넌트를 쓴다.
function UnderstandingStep({
  subjects,
  onChangeUnderstanding,
  onUpdateSubject,
  onBack,
  onNext,
}) {
  const [detailIds, setDetailIds] = useState(() => new Set());
  const answered = subjects.filter((subject) => subject.understanding !== UNKNOWN).length;

  return (
    <section>
      <div className="card">
        <h2 className="section-title">지금 얼마나 알고 있나요?</h2>
        <p className="card-lead">
          모르겠으면 &ldquo;모르겠다&rdquo;를 골라도 돼요. 그 과목은 이 항목을 빼고 계산해요.
          난이도·학점 같은 항목까지 지금 채우고 싶으면 과목별 &ldquo;더 자세히&rdquo;를 여세요.
        </p>

        <ul className="understanding-list">
          {subjects.map((subject) => {
            const isDetailOpen = detailIds.has(subject.id);

            return (
              <li key={subject.id} className="understanding-item">
                <div className="understanding-head">
                  <span className="understanding-name">{subject.name}</span>
                  <span className="meta-chip meta-chip-dday">
                    {formatDday(getDaysUntil(subject.examDate))}
                  </span>
                </div>

                <ScoreSelector
                  label={`${subject.name} 이해도`}
                  hideLabel
                  value={subject.understanding}
                  onChange={(value) => onChangeUnderstanding(subject.id, value)}
                  levelLabels={UNDERSTANDING_LEVELS}
                />

                <button
                  type="button"
                  className="link-button"
                  aria-expanded={isDetailOpen}
                  onClick={() => toggleInSet(setDetailIds, subject.id)}
                >
                  {subject.name} 더 자세히 <Chevron open={isDetailOpen} />
                </button>

                {isDetailOpen && (
                  <SubjectDetailFields subject={subject} onChange={onUpdateSubject} />
                )}
              </li>
            );
          })}
        </ul>

        <p className="step-progress-note">
          {subjects.length}개 중 {answered}개 답함
        </p>
      </div>

      <div className="form-actions">
        <button type="button" className="button button-ghost" onClick={onBack}>
          ← 과목 더 담기
        </button>
        <button type="button" className="button button-primary" onClick={onNext}>
          결과 보기
        </button>
      </div>
    </section>
  );
}

export default UnderstandingStep;
