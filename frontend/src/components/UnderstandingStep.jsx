import { useState } from "react";
import ScoreSelector from "./ScoreSelector";
import SubjectDetailFields from "./SubjectDetailFields";
import Chevron from "./Chevron";
import { getDaysUntil, formatDday } from "../utils/daysUntil";
import { STUDY_AMOUNT_LEVELS, UNDERSTANDING_LEVELS } from "../utils/scaleLabels";
import { toggleInSet } from "../utils/toggleSet";

// 2단계. 가중치가 가장 큰 두 요인이 임박도(0.18)와 이해도(0.18)다.
// 날짜는 1단계에서 받았으니 여기서 이해도를 받으면 순위의 큰 줄기가 잡힌다.
// 공부 분량은 "얼마나 남았나"를 가르는 값이라 이해도와 함께 앞에서 받는다.
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

  return (
    <section>
      <div className="card">
        <h2 className="section-title">공부할 양은 얼마나 되고, 얼마나 알고 있나요?</h2>
        <p className="card-lead">
          공부할 양이 많을수록, 이해도가 낮을수록 먼저 공부할 과목으로 봐요.
          모르겠으면 &ldquo;모르겠다&rdquo;를 고르면 그 항목은 빼고 계산해요.
          과목별 &ldquo;더 자세히&rdquo;에서 난이도·학점도 채우면 순위가 더 정확해져요.
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
                  label="공부 분량 (시험 범위)"
                  value={subject.studyAmount}
                  onChange={(value) => onUpdateSubject(subject.id, { studyAmount: value })}
                  levelLabels={STUDY_AMOUNT_LEVELS}
                />

                {/* 항목이 둘이 됐으니 어느 쪽이 무엇인지 구분되도록 라벨을 드러낸다.
                    (이해도 하나뿐이던 때는 과목명 아래라 감춰도 뜻이 통했다.) */}
                <ScoreSelector
                  label="이해도"
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
                  <SubjectDetailFields
                    subject={subject}
                    onChange={onUpdateSubject}
                    showStudyAmount={false}
                  />
                )}
              </li>
            );
          })}
        </ul>

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
