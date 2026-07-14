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
        <label style={styles.field}>
          <span style={styles.label}>이름</span>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            style={styles.input}
            placeholder="홍길동"
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>아이디</span>
          <input
            name="username"
            value={form.username}
            onChange={onChange}
            style={styles.input}
            placeholder="career01"
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>이메일</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            style={styles.input}
            placeholder="user@example.com"
          />
        </label>

        <label style={{ ...styles.field, ...styles.lookupField }}>
          <span style={styles.label}>학교</span>
          <div style={styles.schoolSearch}>
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
              style={styles.input}
              placeholder="학교명을 검색하세요"
            />
            <button
              type="button"
              style={styles.searchButton}
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
                  style={styles.schoolResultItem}
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

        <label style={{ ...styles.field, ...styles.lookupField }}>
          <span style={styles.label}>전공</span>
          <div style={styles.schoolSearch}>
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
              style={styles.input}
              placeholder={selectedSchool ? "학과명을 검색하세요" : "학교를 먼저 선택하세요"}
              disabled={!selectedSchool}
            />
            <button
              type="button"
              style={styles.searchButton}
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
                  style={styles.schoolResultItem}
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

        <label style={styles.field}>
          <span style={styles.label}>비밀번호</span>
          <div style={styles.passwordField}>
            <input
              type={isPasswordVisible ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={onChange}
              style={{ ...styles.input, ...styles.passwordInput }}
              placeholder="영문, 숫자, 특수문자 포함"
            />
            <button
              type="button"
              style={styles.passwordToggle}
              onClick={onTogglePassword}
              aria-label={isPasswordVisible ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              {isPasswordVisible ? "숨김" : "보기"}
            </button>
          </div>
        </label>

        <label style={styles.field}>
          <span style={styles.label}>비밀번호 확인</span>
          <div style={styles.passwordField}>
            <input
              type={isPasswordConfirmVisible ? "text" : "password"}
              name="passwordConfirm"
              value={form.passwordConfirm}
              onChange={onChange}
              style={{ ...styles.input, ...styles.passwordInput }}
              placeholder="비밀번호 재입력"
            />
            <button
              type="button"
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
        <button type="button" style={styles.secondaryButton} onClick={onMoveToLogin}>
          로그인으로 이동
        </button>
        <button type="submit" style={styles.primaryButton} disabled={isSubmitting}>
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
  field: {
    position: "relative",
    display: "grid",
    gap: "8px",
    alignContent: "start",
  },
  lookupField: {
    minHeight: "224px",
  },
  schoolSearch: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "8px",
  },
  label: {
    color: "#334155",
    fontSize: "14px",
    fontWeight: 700,
  },
  input: {
    width: "100%",
    minHeight: "42px",
    padding: "0 12px",
    borderRadius: "12px",
    border: "1px solid #dbe3ef",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  passwordField: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: "72px",
  },
  passwordToggle: {
    position: "absolute",
    top: "50%",
    right: "8px",
    minWidth: "48px",
    height: "34px",
    padding: "0 10px",
    border: "1px solid #dbe3ef",
    borderRadius: "999px",
    background: "#f8fafc",
    color: "#334155",
    cursor: "pointer",
    transform: "translateY(-50%)",
    fontWeight: 700,
  },
  searchButton: {
    minHeight: "42px",
    padding: "0 10px",
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "13px",
    fontWeight: 800,
    whiteSpace: "nowrap",
    cursor: "pointer",
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
  schoolResultItem: {
    display: "grid",
    gap: "3px",
    width: "100%",
    minHeight: "40px",
    padding: "7px 10px",
    border: 0,
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    textAlign: "left",
    cursor: "pointer",
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
  primaryButton: {
    minHeight: "44px",
    padding: "0 18px",
    border: 0,
    borderRadius: "999px",
    background: "linear-gradient(135deg, #2563eb, #06b6d4)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 14px 26px rgba(37, 99, 235, 0.28)",
  },
  secondaryButton: {
    minHeight: "44px",
    padding: "0 18px",
    border: "1px solid #dbe3ef",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#334155",
    fontWeight: 800,
    cursor: "pointer",
  },
};

export default SignupForm;
