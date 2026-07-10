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

const MIN_PROJECT_TITLE_LENGTH = 2;
const MAX_PROJECT_TITLE_LENGTH = 120;
const MIN_RAW_TEXT_LENGTH = 120;
const MAX_RAW_TEXT_LENGTH = 20000;

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
  const projectTitleLength = projectTitle.trim().length;
  const textLength = inputText.trim().length;
  const isProjectTitleValid =
    projectTitleLength >= MIN_PROJECT_TITLE_LENGTH &&
    projectTitleLength <= MAX_PROJECT_TITLE_LENGTH;
  const isTextLongEnough = textLength >= MIN_RAW_TEXT_LENGTH;
  const isTextTooLong = textLength > MAX_RAW_TEXT_LENGTH;
  const canAnalyze = isProjectTitleValid && isTextLongEnough && !isTextTooLong && !isAnalyzing;
  const showProjectTitleGuide = projectTitleLength > 0 && !isProjectTitleValid;
  const showShortGuide = textLength > 0 && !isTextLongEnough;

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
          aria-label="프로젝트 이름"
          value={projectTitle}
          maxLength={MAX_PROJECT_TITLE_LENGTH}
          onChange={(event) => onProjectTitleChange(event.target.value)}
          placeholder="예: 캠퍼스 공모전 서비스 기획"
          aria-invalid={showProjectTitleGuide}
          aria-describedby={showProjectTitleGuide ? "project-title-guide" : undefined}
        />
        {showProjectTitleGuide ? (
          <small className="field-guide error" id="project-title-guide">
            프로젝트 이름을 2자 이상 120자 이하로 입력하세요.
          </small>
        ) : null}
      </label>

      <label className="field">
        <span>회의록 / 메모 / 피드백</span>
        <textarea
          aria-label="회의록 / 메모 / 피드백"
          value={inputText}
          onChange={(event) => onInputTextChange(event.target.value)}
          placeholder="팀 회의 내용, 결정 이유, 각자 의견, 아직 남은 질문을 입력하세요."
          maxLength={MAX_RAW_TEXT_LENGTH}
          aria-invalid={showShortGuide || isTextTooLong}
          aria-describedby={
            showShortGuide || isTextTooLong
              ? "raw-text-counter raw-text-guide"
              : "raw-text-counter"
          }
        />
        <small className={`counter ${isTextTooLong ? "error" : ""}`} id="raw-text-counter">
          {textLength.toLocaleString()} / {MAX_RAW_TEXT_LENGTH.toLocaleString()}자
        </small>
      </label>

      {showShortGuide ? (
        <p className="short-guide" id="raw-text-guide">
          분석하려면 회의 흐름, 결정 이유, 남은 질문을 포함해 {MIN_RAW_TEXT_LENGTH - textLength}자를 더 입력하세요.
        </p>
      ) : isTextTooLong ? (
        <p className="short-guide error" id="raw-text-guide">
          입력 기록은 {MAX_RAW_TEXT_LENGTH.toLocaleString()}자 이하로 줄여주세요.
        </p>
      ) : null}

      <p className="privacy-note">
        기본 로컬 모드에서는 외부로 전송하지 않습니다. 서버에서 OpenAI provider를 활성화한
        경우 입력 기록이 OpenAI로 전송됩니다. 민감한 개인정보나 비밀번호는 입력하지 마세요.
      </p>

      {analysisError ? (
        <p className="analysis-message error" role="alert">
          {analysisError}
        </p>
      ) : (
        <p className="analysis-message">{analysisNotice}</p>
      )}

      <div className="action-row">
        <button className="button secondary" type="button" onClick={onLoadSample} disabled={isAnalyzing}>
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
