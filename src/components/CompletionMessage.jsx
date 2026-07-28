import nagbotSuccess from "../assets/characters/nagbot_success.png";
import successSparkles from "../assets/ui/effects/success_sparkles.png";
import "./CompletionMessage.css";

const COMPLETION_TEXT = "완료했어요! 오늘도 한 걸음 나아갔어요.";

// microTask/entryLevel은 Lv2 모달을 거쳐 시작한 경우에만 값이 있다(카드 직접 클릭 시엔
// 둘 다 null) — 그 경우 해당 항목은 표시하지 않는다.
function CompletionMessage({ title, microTask, elapsedLabel, entryLevel }) {
  return (
    <div className="completion-message-wrap">
      <div className="completion-visual" aria-hidden="true">
        <img
          className="completion-sparkles"
          src={successSparkles}
          alt=""
          aria-hidden="true"
        />
        <img
          className="completion-character"
          src={nagbotSuccess}
          alt=""
          aria-hidden="true"
        />
      </div>
      <p className="completion-message" role="status" aria-live="polite">
        {COMPLETION_TEXT}
      </p>
      <dl className="completion-summary">
        {title && (
          <div className="completion-summary-row">
            <dt>완료한 할일</dt>
            <dd>{title}</dd>
          </div>
        )}
        {microTask && (
          <div className="completion-summary-row">
            <dt>첫 행동</dt>
            <dd>{microTask}</dd>
          </div>
        )}
        {elapsedLabel && (
          <div className="completion-summary-row">
            <dt>집중 시간</dt>
            <dd>{elapsedLabel}</dd>
          </div>
        )}
        {entryLevel != null && (
          <div className="completion-summary-row">
            <dt>진입 레벨</dt>
            <dd>Lv{entryLevel}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export default CompletionMessage;
