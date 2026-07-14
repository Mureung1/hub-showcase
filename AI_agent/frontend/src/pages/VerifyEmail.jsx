import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Header from "../components/layout/Header";
import { verifyEmail } from "../features/auth/authService";
import { navigate, routes } from "../router";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("이메일 인증을 확인하고 있습니다.");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage("인증 토큰이 없습니다. 메일의 인증 링크를 다시 열어 주세요.");
        return;
      }

      try {
        const user = await verifyEmail(token);
        setStatus("success");
        setMessage(`${user.email} 인증이 완료되어 회원가입이 최종 완료되었습니다.`);
      } catch (error) {
        setStatus("error");
        setMessage(error.message);
      }
    };

    verify();
  }, [token]);

  const isSuccess = status === "success";
  const title =
    status === "verifying"
      ? "이메일 인증 확인 중"
      : isSuccess
        ? "이메일 인증이 완료되었습니다"
        : "인증 링크가 유효하지 않습니다";

  return (
    <main style={styles.container}>
      <Header />
      <section style={styles.page}>
        <div style={styles.card}>
          <p style={styles.badge}>Email Verification</p>
          <h1 style={styles.title}>{title}</h1>
          <p style={isSuccess ? styles.successDescription : styles.description}>
            {message}
          </p>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => navigate(routes.login)}
          >
            로그인으로 이동
          </button>
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
    minHeight: "calc(100vh - 67px)",
    padding: "clamp(24px, 4vw, 44px) 0 92px",
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
  },
  card: {
    width: "min(620px, calc(100% - 32px))",
    padding: "34px",
    borderRadius: "18px",
    background: "rgba(255, 255, 255, 0.78)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 24px 54px rgba(15, 23, 42, 0.12)",
    textAlign: "center",
    backdropFilter: "blur(18px) saturate(140%)",
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
    margin: "0 0 14px",
    color: "#0f172a",
    fontSize: "clamp(28px, 4vw, 42px)",
    fontWeight: 800,
    lineHeight: 1.18,
    wordBreak: "keep-all",
  },
  description: {
    margin: "0 0 24px",
    color: "#475569",
    fontSize: "16px",
    lineHeight: 1.7,
  },
  successDescription: {
    margin: "0 0 24px",
    color: "#166534",
    fontSize: "16px",
    fontWeight: 700,
    lineHeight: 1.7,
  },
  primaryButton: {
    minHeight: "44px",
    padding: "0 18px",
    margin: "0 5px",
    border: 0,
    borderRadius: "999px",
    background: "linear-gradient(135deg, #2563eb, #06b6d4)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 14px 26px rgba(37, 99, 235, 0.28)",
  },
};

export default VerifyEmail;
