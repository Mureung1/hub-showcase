import { useEffect, useMemo, useState } from "react";

import Header from "../components/layout/Header";
import { verifyPendingUser } from "../features/auth/authStorage";
import { navigate, routes } from "../router";

function VerifyEmail() {
  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, []);
  const [verifiedUser, setVerifiedUser] = useState(null);

  useEffect(() => {
    setVerifiedUser(verifyPendingUser(token));
  }, [token]);

  const isVerified = Boolean(verifiedUser);

  return (
    <main style={styles.container}>
      <Header />
      <section style={styles.page}>
        <div style={styles.card}>
          <p style={styles.badge}>Email Verification</p>
          <h1 style={styles.title}>
            {isVerified ? "이메일 확인이 완료되었습니다." : "확인 링크가 유효하지 않습니다."}
          </h1>
          <p style={styles.description}>
            {isVerified
              ? `${verifiedUser.email} 인증이 완료되어 회원가입이 최종 완료되었습니다.`
              : "이미 사용된 링크이거나 인증 대기 중인 계정 정보가 없습니다."}
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
    borderRadius: "24px",
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
  },
  description: {
    margin: "0 0 24px",
    color: "#475569",
    fontSize: "16px",
    lineHeight: 1.7,
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
};

export default VerifyEmail;
