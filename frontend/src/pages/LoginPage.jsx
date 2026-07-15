import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();

  function handleKakaoLogin() {
    // TODO: 실제 카카오 OAuth 연동 전까지는 홈 화면으로 바로 이동
    navigate("/home");
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-circle login-hero-circle-top" />
        <div className="login-hero-circle login-hero-circle-bottom" />
        <h1 className="login-hero-title">필메이트</h1>
        <p className="login-hero-subtitle">
          영양제 복용과 재고를
          <br />
          한 번에 챙기는 스마트 루틴
        </p>
      </div>

      <div className="login-panel">
        <h2 className="login-panel-title">간편하게 시작해볼까요?</h2>
        <button type="button" className="kakao-button" onClick={handleKakaoLogin}>
          <span className="kakao-dot" />
          카카오로 시작하기
        </button>
        <p className="login-terms">
          계속 진행 시 이용약관 및
          <br />
          개인정보처리방침에 동의하게 돼요
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
