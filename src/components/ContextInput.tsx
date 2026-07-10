type ContextInputProps = {
  projectTitle: string;
  inputText: string;
  isAnalyzing: boolean;
  analysisError: string | null;
  analysisNotice: string;
  onProjectTitleChange: (value: string) => void;
  onInputTextChange: (value: string) => void;
  onLoadSample: () => void;
  onAnalyze: () => void | Promise<void>;
};

function ContextInput({
  projectTitle,
  inputText,
  isAnalyzing,
  analysisError,
  analysisNotice,
  onProjectTitleChange,
  onInputTextChange,
  onLoadSample,
  onAnalyze,
}: ContextInputProps) {
  const canAnalyze = projectTitle.trim().length > 0 && inputText.trim().length > 0 && !isAnalyzing;
  const textLength = inputText.trim().length;
  const showShortGuide = textLength > 0 && textLength < 500;

  return (
    <section className="input-panel" aria-labelledby="input-title">
      <div className="panel-heading">
        <p className="section-kicker">Step 01</p>
        <h2 id="input-title">프로젝트 기록 입력</h2>
        <p>
          회의록, 조사 메모, 피드백을 붙여넣으면 AI가 팀이 함께 알아야 할
          맥락을 구조화합니다.
        </p>
      </div>

      <label className="field">
        <span>프로젝트 이름</span>
        <input
          value={projectTitle}
          onChange={(event) => onProjectTitleChange(event.target.value)}
          placeholder="예: 캠퍼스 공모전 서비스 기획"
        />
      </label>

      <label className="field">
        <span>회의록 / 메모 / 피드백</span>
        <textarea
          value={inputText}
          onChange={(event) => onInputTextChange(event.target.value)}
          placeholder="팀 회의 내용, 결정 이유, 각자 의견, 아직 남은 질문을 입력하세요."
        />
        <small className="counter">{textLength.toLocaleString()}자 입력됨</small>
      </label>

      {showShortGuide ? (
        <p className="short-guide">
          더 정확한 맥락 분석을 위해 회의 흐름, 결정 이유, 남은 질문을 함께 적는 것을 권장합니다.
        </p>
      ) : null}

      <p className="privacy-note">
        민감한 개인정보나 비밀번호는 입력하지 않는 것을 권장합니다.
      </p>

      {analysisError ? (
        <p className="analysis-message error" role="alert">
          {analysisError}
        </p>
      ) : (
        <p className="analysis-message">{analysisNotice}</p>
      )}

      <div className="action-row">
        <button className="button secondary" type="button" onClick={onLoadSample}>
          예시 불러오기
        </button>
        <button
          className="button primary"
          type="button"
          onClick={onAnalyze}
          disabled={!canAnalyze}
        >
          {isAnalyzing ? "분석 중" : "맥락 분석하기"}
        </button>
      </div>
    </section>
  );
}

export default ContextInput;
