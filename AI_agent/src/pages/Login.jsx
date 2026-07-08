import { useState } from "react";

import Header from "../components/layout/Header";
import { findAccountByEmail, getPendingUser, getUser, saveSession } from "../features/auth/authStorage";
import { navigate, routes } from "../router";

const initialLoginForm = {
  account: "",
  password: "",
};

const initialFindIdForm = {
  email: "",
};

const initialFindPasswordForm = {
  username: "",
};

function Login() {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [findIdForm, setFindIdForm] = useState(initialFindIdForm);
  const [findPasswordForm, setFindPasswordForm] = useState(
    initialFindPasswordForm
  );
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setMessage("");
    setErrorMessage("");
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;

    setErrorMessage("");
    setMessage("");
    setLoginForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleFindIdChange = (event) => {
    const { name, value } = event.target;

    setErrorMessage("");
    setMessage("");
    setFindIdForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleFindPasswordChange = (event) => {
    const { name, value } = event.target;

    setErrorMessage("");
    setMessage("");
    setFindPasswordForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleLoginSubmit = (event) => {
    event.preventDefault();

    const account = loginForm.account.trim();
    const password = loginForm.password;

    if (!account || !password) {
      setErrorMessage("아이디 또는 이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    const user = getUser();
    const pendingUser = getPendingUser();

    if (
      pendingUser &&
      (pendingUser.username === account || pendingUser.email === account)
    ) {
      setErrorMessage("이메일 확인을 완료한 뒤 로그인할 수 있습니다.");
      return;
    }

    if (!user || (user.username !== account && user.email !== account)) {
      setErrorMessage("가입된 계정을 찾을 수 없습니다.");
      return;
    }

    if (!user.emailVerified) {
      setErrorMessage("이메일 확인을 완료한 뒤 로그인할 수 있습니다.");
      return;
    }

    if (user.password !== password) {
      setErrorMessage("비밀번호가 일치하지 않습니다.");
      return;
    }

    saveSession(user);
    alert(`${user.name}님, 로그인되었습니다.`);
    navigate(routes.home);
  };

  const handleFindIdSubmit = (event) => {
    event.preventDefault();

    const email = findIdForm.email.trim();

    if (!email) {
      setErrorMessage("가입한 이메일을 입력해 주세요.");
      return;
    }

    const account = findAccountByEmail(email);

    if (!account) {
      setErrorMessage("해당 이메일로 등록된 계정을 찾을 수 없습니다.");
      return;
    }

    const suffix =
      account.storageType === "pending" ? " (이메일 인증 대기)" : "";
    setMessage(`아이디는 ${account.username}${suffix} 입니다.`);
  };

  const handleFindPasswordSubmit = (event) => {
    event.preventDefault();

    const username = findPasswordForm.username.trim();

    if (!username) {
      setErrorMessage("아이디를 입력해 주세요.");
      return;
    }

    const user = getUser();
    const pendingUser = getPendingUser();
    const account =
      user?.username === username
        ? { ...user, storageType: "user" }
        : pendingUser?.username === username
          ? { ...pendingUser, storageType: "pending" }
          : null;

    if (!account) {
      setErrorMessage("해당 아이디로 등록된 계정을 찾을 수 없습니다.");
      return;
    }

    const suffix =
      account.storageType === "pending"
        ? " 현재 계정은 이메일 인증 대기 상태입니다."
        : "";
    setMessage(`비밀번호는 ${account.password} 입니다.${suffix}`);
  };

  return (
    <main style={styles.container}>
      <Header />
      <section style={styles.page}>
        <div style={styles.intro}>
          <p style={styles.badge}>Career Mission</p>
          <h1 style={styles.title}>로그인</h1>
          <p style={styles.description}>
            계정 로그인과 아이디/비밀번호 찾기를 한 화면에서 처리합니다.
          </p>
        </div>

        <div style={styles.card}>
          <div style={styles.modeTabs}>
            <button
              type="button"
              style={mode === "login" ? { ...styles.modeTab, ...styles.modeTabActive } : styles.modeTab}
              onClick={() => handleModeChange("login")}
            >
              계정 로그인
            </button>
            <button
              type="button"
              style={mode === "findId" ? { ...styles.modeTab, ...styles.modeTabActive } : styles.modeTab}
              onClick={() => handleModeChange("findId")}
            >
              아이디 찾기
            </button>
            <button
              type="button"
              style={mode === "findPassword" ? { ...styles.modeTab, ...styles.modeTabActive } : styles.modeTab}
              onClick={() => handleModeChange("findPassword")}
            >
              비밀번호 찾기
            </button>
          </div>

          {mode === "login" && (
            <form onSubmit={handleLoginSubmit}>
              <div style={styles.formHeader}>
                <strong style={styles.formTitle}>계정 로그인</strong>
                <span style={styles.formHint}>
                  아이디 또는 이메일로 로그인할 수 있습니다.
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
                    {isPasswordVisible ? (
                      <svg style={styles.eyeIcon} viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3.3 2 22 20.7 20.7 22l-3.3-3.3A12.7 12.7 0 0 1 12 20C5 20 1.4 13.7 1.2 13.4a2.8 2.8 0 0 1 0-2.8 16 16 0 0 1 4.3-4.8L2 3.3 3.3 2Zm5 6.7a5 5 0 0 0 7 7l-1.5-1.5a3 3 0 0 1-4-4L8.3 8.7Zm3-3.6c.2 0 .5-.1.7-.1 7 0 10.6 6.3 10.8 6.6.5.9.5 1.9 0 2.8a14.7 14.7 0 0 1-2.4 3L17 14a5 5 0 0 0-6.4-6.4L8.9 5.9a12.4 12.4 0 0 1 2.4-.8Z" />
                      </svg>
                    ) : (
                      <svg style={styles.eyeIcon} viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 5c7 0 10.6 6.3 10.8 6.6.5.9.5 1.9 0 2.8C22.6 14.7 19 21 12 21S1.4 14.7 1.2 14.4a2.8 2.8 0 0 1 0-2.8C1.4 11.3 5 5 12 5Zm0 2C6.3 7 3.3 12.2 3 12.6c-.1.2-.1.6 0 .8.3.4 3.3 5.6 9 5.6s8.7-5.2 9-5.6c.1-.2.1-.6 0-.8-.3-.4-3.3-5.6-9-5.6Zm0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
                      </svg>
                    )}
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
                <button type="submit" style={styles.primaryButton}>
                  로그인
                </button>
              </div>
            </form>
          )}

          {mode === "findId" && (
            <form onSubmit={handleFindIdSubmit}>
              <div style={styles.formHeader}>
                <strong style={styles.formTitle}>아이디 찾기</strong>
                <span style={styles.formHint}>
                  가입한 이메일을 입력하면 아이디를 확인할 수 있습니다.
                </span>
              </div>

              <label style={styles.field}>
                <span style={styles.label}>이메일</span>
                <input
                  name="email"
                  value={findIdForm.email}
                  onChange={handleFindIdChange}
                  style={styles.input}
                  placeholder="user@example.com"
                  autoComplete="email"
                />
              </label>

              {errorMessage && <p style={styles.error}>{errorMessage}</p>}
              {message && <p style={styles.success}>{message}</p>}

              <div style={styles.actions}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => handleModeChange("login")}
                >
                  로그인으로 돌아가기
                </button>
                <button type="submit" style={styles.primaryButton}>
                  아이디 확인
                </button>
              </div>
            </form>
          )}

          {mode === "findPassword" && (
            <form onSubmit={handleFindPasswordSubmit}>
              <div style={styles.formHeader}>
                <strong style={styles.formTitle}>비밀번호 찾기</strong>
                <span style={styles.formHint}>
                  아이디를 입력하면 현재 저장된 비밀번호를 알려줍니다.
                </span>
              </div>

              <label style={styles.field}>
                <span style={styles.label}>아이디</span>
                <input
                  name="username"
                  value={findPasswordForm.username}
                  onChange={handleFindPasswordChange}
                  style={styles.input}
                  placeholder="career01"
                  autoComplete="username"
                />
              </label>

              {errorMessage && <p style={styles.error}>{errorMessage}</p>}
              {message && <p style={styles.success}>{message}</p>}

              <div style={styles.actions}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => handleModeChange("login")}
                >
                  로그인으로 돌아가기
                </button>
                <button type="submit" style={styles.primaryButton}>
                  비밀번호 확인
                </button>
              </div>
            </form>
          )}
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
    borderRadius: "24px",
    background: "rgba(255, 255, 255, 0.76)",
    border: "1px solid rgba(226, 232, 240, 0.88)",
    boxShadow: "0 24px 54px rgba(15, 23, 42, 0.12)",
    backdropFilter: "blur(18px) saturate(140%)",
  },
  modeTabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  modeTab: {
    minHeight: "36px",
    padding: "0 14px",
    border: "1px solid #dbe3ef",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  modeTabActive: {
    background: "#eff6ff",
    borderColor: "#bfdbfe",
    color: "#1d4ed8",
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
    paddingRight: "62px",
  },
  passwordToggle: {
    position: "absolute",
    top: "50%",
    right: "8px",
    width: "34px",
    height: "34px",
    padding: 0,
    border: "1px solid #dbe3ef",
    borderRadius: "50%",
    background: "#f8fafc",
    color: "#334155",
    cursor: "pointer",
    transform: "translateY(-50%)",
    display: "grid",
    placeItems: "center",
  },
  eyeIcon: {
    width: "18px",
    height: "18px",
    display: "block",
    fill: "currentColor",
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
