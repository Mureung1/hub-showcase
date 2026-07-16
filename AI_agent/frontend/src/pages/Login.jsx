import { useState } from "react";

import LoginForm from "../components/auth/LoginForm";
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
      alert(`${loginResult.user.name}님, 로그인되었습니다.`);
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

        <LoginForm
          loginForm={loginForm}
          errorMessage={errorMessage}
          message={message}
          isPasswordVisible={isPasswordVisible}
          isSubmitting={isSubmitting}
          onChange={handleLoginChange}
          onSubmit={handleLoginSubmit}
          onTogglePassword={() =>
            setIsPasswordVisible((currentValue) => !currentValue)
          }
          onMoveToSignup={() => navigate(routes.signup)}
        />
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
    wordBreak: "keep-all",
  },
  description: {
    margin: 0,
    color: "#475569",
    fontSize: "16px",
    lineHeight: 1.75,
  },
};

export default Login;
