import { useState } from "react";

import Header from "../components/layout/Header";
import { loginUser } from "../features/auth/authService";
import { navigate, routes } from "../router";

const initialLoginForm = {
  account: "",
  password: "",
};

function Login() {
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginChange = (event) => {
    const { name, value } = event.target;

    setErrorMessage("");
    setMessage("");
    setLoginForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();

    const account = loginForm.account.trim();
    const password = loginForm.password;

    if (!account || !password) {
      setErrorMessage("아이디 또는 이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const loginResult = await loginUser({ account, password });
      alert(`${loginResult.user.name}님 로그인되었습니다.`);
      navigate(routes.home);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={styles.container}>
      <Header />
      <section style={styles.page}>
        <div style={styles.intro}>
          <p style={styles.badge}>Career Mission</p>
          <h1 style={styles.title}>로그인</h1>
          <p style={styles.description}>
            이메일 인증이 완료된 계정만 로그인할 수 있습니다.
          </p>
        </div>

        <div style={styles.card}>
          <form onSubmit={handleLoginSubmit}>
            <div style={styles.formHeader}>
              <strong style={styles.formTitle}>계정 로그인</strong>
              <span style={styles.formHint}>
                아이디 또는 이메일과 비밀번호를 입력해 주세요.
              </span>
            </div>

            <label style={styles.field}>
              <span style={styles.label}>아이디 또는 이메일</span>
              <input
                name="account"
                value={loginForm.account}
                onChange={handleLoginChange}
                style={styles.input}
                placeholder="career01 또는 user@example.com"
                autoComplete="username"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>비밀번호</span>
              <div style={styles.passwordField}>
                <input
                  type={isPasswordVisible ? "text" : "password"}
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  style={{ ...styles.input, ...styles.passwordInput }}
                  placeholder="비밀번호 입력"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  style={styles.passwordToggle}
                  onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
                  aria-label={isPasswordVisible ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {isPasswordVisible ? "숨김" : "보기"}
                </button>
              </div>
            </label>

            {errorMessage && <p style={styles.error}>{errorMessage}</p>}
            {message && <p style={styles.success}>{message}</p>}

            <div style={styles.actions}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => navigate(routes.signup)}
              >
                회원가입
              </button>
              <button type="submit" style={styles.primaryButton} disabled={isSubmitting}>
                {isSubmitting ? "로그인 중" : "로그인"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background:
      "radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.16), transparent 28%), radial-gradient(circle at 88% 12%, rgba(6, 182, 212, 0.18), transparent 26%), linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
  },
  page: {
    width: "min(560px, calc(100% - clamp(32px, 6vw, 96px)))",
    minHeight: "calc(100vh - 67px)",
    margin: "0 auto",
    padding: "clamp(24px, 4vw, 44px) 0 92px",
    boxSizing: "border-box",
    display: "grid",
    gap: "24px",
    alignContent: "center",
    justifyItems: "center",
  },
  intro: {
    width: "100%",
    textAlign: "center",
  },
  badge: {
    display: "inline-block",
    margin: "0 0 18px",
    padding: "8px 13px",
    borderRadius: "999px",
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "bold",
  },
  title: {
    margin: "0 0 16px",
    color: "#0f172a",
    fontSize: "clamp(34px, 5vw, 52px)",
    fontWeight: 800,
    lineHeight: 1.12,
  },
  description: {
    margin: 0,
    color: "#475569",
    fontSize: "16px",
    lineHeight: 1.75,
  },
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
  field: {
    display: "grid",
    gap: "8px",
    marginBottom: "16px",
  },
  label: {
    color: "#334155",
    fontSize: "14px",
    fontWeight: 700,
  },
  input: {
    width: "100%",
    minHeight: "46px",
    padding: "0 14px",
    borderRadius: "12px",
    border: "1px solid #dbe3ef",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "15px",
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

export default Login;
