function Field({ children, label, required = false }) {
  return (
    <label className="field profile-field">
      <span>{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}

export default function ProfileForm({
  draft,
  errorMessage,
  isEditing,
  isSaved,
  onBeginEdit,
  onCancelEdit,
  onChange,
  onReset,
  onSave,
  successMessage,
}) {
  function updateLanguageScore(index, key, value) {
    const nextScores = draft.languageScores.map((score, scoreIndex) => (
      scoreIndex === index ? { ...score, [key]: value } : score
    ));
    onChange("languageScores", nextScores);
  }

  function addLanguageScore() {
    onChange("languageScores", [...draft.languageScores, { type: "", score: "" }]);
  }

  function removeLanguageScore(index) {
    const nextScores = draft.languageScores.filter((_, scoreIndex) => scoreIndex !== index);
    onChange("languageScores", nextScores.length ? nextScores : [{ type: "", score: "" }]);
  }

  return (
    <section className="profile-form-panel" id="profile-form" aria-labelledby="profile-form-title">
      <div className="panel-heading profile-form-heading">
        <div>
          <span className="eyebrow">Profile</span>
          <h2 id="profile-form-title">사용자 프로필</h2>
          <p>공고의 필수·우대 조건과 비교할 정보를 저장합니다.</p>
        </div>
        <span className={`profile-state-badge ${isSaved ? "is-saved" : ""}`}>
          {isSaved ? "저장됨" : "입력 필요"}
        </span>
      </div>

      {isSaved && !isEditing ? (
        <div className="profile-saved-row">
          <p>저장된 프로필로 분석과 지원 가능성 판정을 진행합니다.</p>
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={onBeginEdit}>수정</button>
            <button className="text-button danger-text" type="button" onClick={onReset}>초기화</button>
          </div>
        </div>
      ) : (
        <form className="profile-form" onSubmit={onSave} noValidate>
          <div className="profile-grid required-profile-grid">
            <Field label="학교" required>
              <input
                name="school"
                value={draft.school}
                onChange={(event) => onChange("school", event.target.value)}
                placeholder="예: 경북대학교"
              />
            </Field>
            <Field label="학년" required>
              <input
                name="grade"
                type="number"
                min="1"
                max="8"
                step="1"
                value={draft.grade}
                onChange={(event) => onChange("grade", event.target.value)}
                placeholder="예: 2"
              />
            </Field>
            <Field label="전공" required>
              <input
                name="majors"
                value={draft.majors}
                onChange={(event) => onChange("majors", event.target.value)}
                placeholder="컴퓨터학부, 수학"
              />
            </Field>
            <Field label="관심 분야" required>
              <input
                name="interests"
                value={draft.interests}
                onChange={(event) => onChange("interests", event.target.value)}
                placeholder="AI, 소프트웨어, 공모전"
              />
            </Field>
            <Field label="활동 가능 지역" required>
              <input
                name="regions"
                value={draft.regions}
                onChange={(event) => onChange("regions", event.target.value)}
                placeholder="대구, 온라인"
              />
            </Field>
            <fieldset className="field profile-field team-field">
              <legend>팀 참여 가능 여부 *</legend>
              <div className="segmented-control" aria-label="팀 참여 가능 여부">
                <button
                  className={draft.canJoinTeam === true ? "active" : ""}
                  type="button"
                  aria-pressed={draft.canJoinTeam === true}
                  onClick={() => onChange("canJoinTeam", true)}
                >
                  가능
                </button>
                <button
                  className={draft.canJoinTeam === false ? "active" : ""}
                  type="button"
                  aria-pressed={draft.canJoinTeam === false}
                  onClick={() => onChange("canJoinTeam", false)}
                >
                  불가
                </button>
              </div>
            </fieldset>
          </div>

          <div className="profile-optional-heading">
            <strong>선택 정보</strong>
            <span>입력한 항목만 저장·판정에 사용합니다.</span>
          </div>
          <div className="profile-grid optional-profile-grid">
            <Field label="주당 활동 가능 시간">
              <input
                name="availableHoursPerWeek"
                type="number"
                min="0"
                max="168"
                value={draft.availableHoursPerWeek}
                onChange={(event) => onChange("availableHoursPerWeek", event.target.value)}
                placeholder="예: 6"
              />
            </Field>
            <Field label="학점 (4.5 만점)">
              <input
                name="gpa"
                type="number"
                min="0"
                max="4.5"
                step="0.01"
                value={draft.gpa}
                onChange={(event) => onChange("gpa", event.target.value)}
                placeholder="예: 3.8"
              />
            </Field>
            <Field label="소득분위">
              <input
                name="incomeBracket"
                type="number"
                min="1"
                max="10"
                step="1"
                value={draft.incomeBracket}
                onChange={(event) => onChange("incomeBracket", event.target.value)}
                placeholder="예: 5"
              />
            </Field>
          </div>

          <div className="language-score-section">
            <span className="field-label">어학성적</span>
            {draft.languageScores.map((score, index) => (
              <div className="language-score-row" key={`language-score-${index}`}>
                <input
                  aria-label={`어학시험 ${index + 1}`}
                  value={score.type}
                  onChange={(event) => updateLanguageScore(index, "type", event.target.value)}
                  placeholder="시험명 (예: TOEIC)"
                />
                <input
                  aria-label={`어학점수 ${index + 1}`}
                  value={score.score}
                  onChange={(event) => updateLanguageScore(index, "score", event.target.value)}
                  placeholder="점수 또는 등급"
                />
                <button
                  className="icon-button subtle-icon-button"
                  type="button"
                  title="어학성적 삭제"
                  aria-label="어학성적 삭제"
                  onClick={() => removeLanguageScore(index)}
                >
                  ×
                </button>
              </div>
            ))}
            <button className="text-button" type="button" onClick={addLanguageScore}>+ 어학성적 추가</button>
          </div>

          {errorMessage ? <p className="form-message error-message" role="alert">{errorMessage}</p> : null}
          {successMessage ? <p className="form-message success-message" role="status">{successMessage}</p> : null}

          <div className="profile-form-actions">
            <button className="primary-button" type="submit">
              {isSaved ? "수정 내용 저장" : "프로필 저장"}
            </button>
            {isSaved ? (
              <button className="secondary-button" type="button" onClick={onCancelEdit}>취소</button>
            ) : null}
            <button className="text-button danger-text" type="button" onClick={onReset}>초기화</button>
          </div>
        </form>
      )}

      {isSaved && !isEditing && successMessage ? (
        <p className="form-message success-message" role="status">{successMessage}</p>
      ) : null}
    </section>
  );
}
