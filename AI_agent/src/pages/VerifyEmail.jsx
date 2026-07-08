import { useState } from "react";

import Header from "../components/layout/Header";
import {
  getPendingUser,
  verifyCurrentPendingUser,
  verifyPendingUser,
} from "../features/auth/authStorage";
import { navigate, routes } from "../router";

const getInitialVerificationState = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  const verifiedUser = verifyPendingUser(token);

  return {
    verifiedUser,
    hasPendingUser: !verifiedUser && Boolean(getPendingUser()),
  };
};

function VerifyEmail() {
  const [verificationState, setVerificationState] = useState(
    getInitialVerificationState
  );

  const handleManualVerify = () => {
    const verifiedUser = verifyCurrentPendingUser();

    setVerificationState({
      verifiedUser,
      hasPendingUser: false,
    });
  };

  const { verifiedUser, hasPendingUser } = verificationState;
  const isVerified = Boolean(verifiedUser);
  const title = isVerified
    ? "이메일 확인이 완료되었습니다."
    : "확인 링크가 유효하지 않습니다.";
  const description = isVerified
    ? `${verifiedUser.email} 인증이 완료되어 회원가입이 최종 완료되었습니다.`
    : hasPendingUser
      ? "확인 링크의 토큰이 일치하지 않습니다. 현재 브라우저의 인증 대기 계정을 직접 확인할 수 있습니다."
      : "이미 사용된 링크이거나 인증 대기 중인 계정 정보가 없습니다.";

  return (
    <main style={styles.container}>
      <Header />
      <section style={styles.page}>
        <div style={styles.card}>
          <p style={styles.badge}>Email Verification</p>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.description}>{description}</p>

          {!isVerified && hasPendingUser && (
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={handleManualVerify}
            >
              현재 대기 계정 인증하기
            </button>
          )}

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
    margin: "0 5px",
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
    margin: "0 5px 10px",
    border: "1px solid #dbe3ef",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#334155",
    fontWeight: 800,
    cursor: "pointer",
  },
};

export default VerifyEmail;
