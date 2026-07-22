function LoginForm({
  loginForm,
  errorMessage,
  message,
  isPasswordVisible,
  isSubmitting,
  onChange,
  onSubmit,
  onTogglePassword,
  onMoveToSignup,
}) {
  return (
    <div style={styles.card}>
      <form onSubmit={onSubmit}>
        <div style={styles.formHeader}>
          <strong style={styles.formTitle}>계정 로그인</strong>
          <span style={styles.formHint}>
            아이디 또는 이메일과 비밀번호를 입력해 주세요.
          </span>
        </div>

        <label className="cm-field" style={styles.fieldSpacing}>
          <span className="cm-label">아이디 또는 이메일</span>
          <input
            name="account"
            value={loginForm.account}
            onChange={onChange}
            className="cm-input"
            placeholder="career01 또는 user@example.com"
            autoComplete="username"
          />
        </label>

        <label className="cm-field" style={styles.fieldSpacing}>
          <span className="cm-label">비밀번호</span>
          <div className="cm-password-field">
            <input
              type={isPasswordVisible ? "text" : "password"}
              name="password"
              value={loginForm.password}
              onChange={onChange}
              className="cm-input cm-password-input"
              placeholder="비밀번호 입력"
              autoComplete="current-password"
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

        {errorMessage && <p style={styles.error}>{errorMessage}</p>}
        {message && <p style={styles.success}>{message}</p>}

        <div style={styles.actions}>
          <button type="button" className="cm-button cm-button-ghost" onClick={onMoveToSignup}>
            회원가입
          </button>
          <button type="submit" className="cm-button cm-button-primary" disabled={isSubmitting}>
            {isSubmitting ? "로그인 중" : "로그인"}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  card: {
    width: "100%",
    padding: "28px",
    borderRadius: "18px",
    background: "rgba(255, 255, 255, 0.76)",
    border: "1px solid rgba(226, 232, 240, 0.88)",
    boxShadow: "0 24px 54px rgba(15, 23, 42, 0.12)",
    backdropFilter: "blur(18px) saturate(140%)",
  },
  formHeader: {
    display: "grid",
    gap: "6px",
    marginBottom: "22px",
    textAlign: "center",
  },
  formTitle: {
    color: "#0f172a",
    fontSize: "20px",
  },
  formHint: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  fieldSpacing: {
    marginBottom: "16px",
  },
  passwordToggle: {
    position: "absolute",
    top: "50%",
    right: "8px",
    minWidth: "48px",
    transform: "translateY(-50%)",
  },
  error: {
    margin: "0 0 16px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: "14px",
    fontWeight: 700,
  },
  success: {
    margin: "0 0 16px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "14px",
    fontWeight: 700,
  },
  actions: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "6px",
  },
};

export default LoginForm;
