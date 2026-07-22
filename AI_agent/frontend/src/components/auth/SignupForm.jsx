function SignupForm({
  form,
  errorMessage,
  isPasswordVisible,
  isPasswordConfirmVisible,
  schoolResults,
  selectedSchool,
  isSearchingSchool,
  schoolSearchMessage,
  majorResults,
  selectedMajor,
  isSearchingMajor,
  majorSearchMessage,
  isSubmitting,
  onChange,
  onSubmit,
  onSchoolSearch,
  onSchoolSelect,
  onMajorSearch,
  onMajorSelect,
  onTogglePassword,
  onTogglePasswordConfirm,
  onMoveToLogin,
}) {
  return (
    <form style={styles.form} onSubmit={onSubmit}>
      <div style={styles.formHeader}>
        <strong style={styles.formTitle}>계정 정보 입력</strong>
        <span style={styles.formHint}>모든 항목은 MVP 분석에 사용됩니다.</span>
      </div>

      <div style={styles.fieldGrid}>
        <label className="cm-field">
          <span className="cm-label">이름</span>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            className="cm-input"
            placeholder="홍길동"
          />
        </label>

        <label className="cm-field">
          <span className="cm-label">아이디</span>
          <input
            name="username"
            value={form.username}
            onChange={onChange}
            className="cm-input"
            placeholder="career01"
          />
        </label>

        <label className="cm-field">
          <span className="cm-label">이메일</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            className="cm-input"
            placeholder="user@example.com"
          />
        </label>

        <label className="cm-field" style={styles.lookupField}>
          <span className="cm-label">학교</span>
          <div className="cm-lookup-row">
            <input
              name="school"
              value={form.school}
              onChange={onChange}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSchoolSearch();
                }
              }}
              className="cm-input"
              placeholder="학교명을 검색하세요"
            />
            <button
              type="button"
              className="cm-button cm-button-secondary cm-button-square cm-button-compact"
              onClick={onSchoolSearch}
              disabled={isSearchingSchool}
            >
              {isSearchingSchool ? "검색 중" : "학교 찾기"}
            </button>
          </div>
          {schoolSearchMessage && (
            <span style={selectedSchool ? styles.schoolSuccess : styles.schoolMessage}>
              {schoolSearchMessage}
            </span>
          )}
          {schoolResults.length > 0 && (
            <div style={styles.schoolResultList}>
              {schoolResults.map((school) => (
                <button
                  key={school.id}
                  type="button"
                  className="cm-select-button"
                  onClick={() => onSchoolSelect(school)}
                >
                  <strong>{school.name}</strong>
                  <span>
                    {[school.region, school.campus, school.type]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </label>

        <label className="cm-field" style={styles.lookupField}>
          <span className="cm-label">전공</span>
          <div className="cm-lookup-row">
            <input
              name="major"
              value={form.major}
              onChange={onChange}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onMajorSearch();
                }
              }}
              className="cm-input"
              placeholder={selectedSchool ? "학과명을 검색하세요" : "학교를 먼저 선택하세요"}
              disabled={!selectedSchool}
            />
            <button
              type="button"
              className="cm-button cm-button-secondary cm-button-square cm-button-compact"
              onClick={onMajorSearch}
              disabled={!selectedSchool || isSearchingMajor}
            >
              {isSearchingMajor ? "검색 중" : "학과 찾기"}
            </button>
          </div>
          {majorSearchMessage && (
            <span style={selectedMajor ? styles.schoolSuccess : styles.schoolMessage}>
              {majorSearchMessage}
            </span>
          )}
          {majorResults.length > 0 && (
            <div style={styles.schoolResultList}>
              {majorResults.map((major) => (
                <button
                  key={major.id}
                  type="button"
                  className="cm-select-button"
                  onClick={() => onMajorSelect(major)}
                >
                  <strong>{major.name}</strong>
                  <span>
                    {[major.schoolName, major.campus, major.area]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </label>

        <div style={styles.emptyCell}></div>

        <label className="cm-field">
          <span className="cm-label">비밀번호</span>
          <div className="cm-password-field">
            <input
              type={isPasswordVisible ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={onChange}
              className="cm-input cm-password-input"
              placeholder="영문, 숫자, 특수문자 포함"
            />
            <button
              type="button"
              className="cm-button cm-button-ghost cm-button-tight"
              style={styles.passwordToggle}
              onClick={onTogglePassword}
              aria-label={isPasswordVisible ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              {isPasswordVisible ? "숨김" : "보기"}
            </button>
          </div>
        </label>

        <label className="cm-field">
          <span className="cm-label">비밀번호 확인</span>
          <div className="cm-password-field">
            <input
              type={isPasswordConfirmVisible ? "text" : "password"}
              name="passwordConfirm"
              value={form.passwordConfirm}
              onChange={onChange}
              className="cm-input cm-password-input"
              placeholder="비밀번호 재입력"
            />
            <button
              type="button"
              className="cm-button cm-button-ghost cm-button-tight"
              style={styles.passwordToggle}
              onClick={onTogglePasswordConfirm}
              aria-label={
                isPasswordConfirmVisible
                  ? "비밀번호 확인 숨기기"
                  : "비밀번호 확인 보기"
              }
            >
              {isPasswordConfirmVisible ? "숨김" : "보기"}
            </button>
          </div>
        </label>
      </div>

      {errorMessage && <p style={styles.error}>{errorMessage}</p>}

      <div style={styles.actions}>
        <button type="button" className="cm-button cm-button-ghost" onClick={onMoveToLogin}>
          로그인으로 이동
        </button>
        <button type="submit" className="cm-button cm-button-primary" disabled={isSubmitting}>
          {isSubmitting ? "메일 발송 중" : "회원가입 완료"}
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: {
    width: "100%",
    padding: "20px",
    borderRadius: "18px",
    background: "rgba(255, 255, 255, 0.76)",
    border: "1px solid rgba(226, 232, 240, 0.88)",
    boxShadow: "0 24px 54px rgba(15, 23, 42, 0.12)",
    backdropFilter: "blur(18px) saturate(140%)",
  },
  formHeader: {
    display: "grid",
    gap: "4px",
    marginBottom: "14px",
    textAlign: "center",
  },
  formTitle: {
    color: "#0f172a",
    fontSize: "18px",
  },
  formHint: {
    color: "#64748b",
    fontSize: "14px",
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  },
  lookupField: {
    minHeight: "224px",
  },
  passwordToggle: {
    position: "absolute",
    top: "50%",
    right: "8px",
    minWidth: "48px",
    transform: "translateY(-50%)",
  },
  schoolMessage: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.4,
  },
  schoolSuccess: {
    color: "#15803d",
    fontSize: "13px",
    fontWeight: 700,
    lineHeight: 1.4,
  },
  schoolResultList: {
    display: "grid",
    gap: "8px",
    maxHeight: "142px",
    overflowY: "auto",
    padding: "8px",
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 34px rgba(15, 23, 42, 0.14)",
  },
  emptyCell: {
    display: "block",
  },
  error: {
    margin: "16px 0 0",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: "14px",
    fontWeight: 700,
  },
  actions: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "16px",
  },
};

export default SignupForm;
