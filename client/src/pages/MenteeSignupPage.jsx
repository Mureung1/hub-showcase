import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { routePaths } from "../routes/routePaths";

function MenteeSignupPage() {
  const navigate = useNavigate();
  const [isSignupComplete, setIsSignupComplete] = useState(false);

  useEffect(() => {
    if (!isSignupComplete) return undefined;

    const redirectTimer = window.setTimeout(() => {
      navigate(routePaths.landing, { replace: true });
    }, 1800);

    return () => window.clearTimeout(redirectTimer);
  }, [isSignupComplete, navigate]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsSignupComplete(true);
  };

  return (
    <div className="mentee-signup-page">
      <header className="page-header signup-header">
        <Brand />
        <Link className="button button-neutral" to="/signup">
          역할 다시 선택
        </Link>
      </header>

      <main className="page-container mentee-signup-container">
        <section className="mentee-signup-heading" aria-labelledby="mentee-signup-title">
          <p className="eyebrow">MENTEE SIGN UP</p>
          <h1 className="page-title" id="mentee-signup-title">멘티 회원가입</h1>
          <p className="body-text">멘토링을 시작하기 위한 기본 정보를 입력해 주세요.</p>
        </section>

        <form className="card mentee-signup-form" onSubmit={handleSubmit}>
          <div className="form-section-heading">
            <h2 className="card-title">개인정보 입력</h2>
            <p className="muted-text"><span aria-hidden="true">*</span> 표시는 필수 입력 항목입니다.</p>
          </div>

          <div className="signup-field-list">
            <label className="signup-field-group">
              <span className="signup-field-label">이름 <span aria-hidden="true">*</span></span>
              <input className="field" type="text" name="name" autoComplete="name" placeholder="이름을 입력해 주세요" required />
            </label>

            <label className="signup-field-group">
              <span className="signup-field-label">닉네임 <span aria-hidden="true">*</span></span>
              <input className="field" type="text" name="nickname" autoComplete="nickname" placeholder="서비스에서 사용할 닉네임을 입력해 주세요" required />
            </label>

            <label className="signup-field-group">
              <span className="signup-field-label">아이디 <span aria-hidden="true">*</span></span>
              <input className="field" type="text" name="username" autoComplete="username" placeholder="영문과 숫자를 조합해 입력해 주세요" required />
            </label>

            <label className="signup-field-group">
              <span className="signup-field-label">비밀번호 <span aria-hidden="true">*</span></span>
              <input className="field" type="password" name="password" autoComplete="new-password" placeholder="8자 이상 입력해 주세요" minLength="8" required />
            </label>

            <div className="signup-field-group">
              <label className="signup-field-label" htmlFor="mentee-email">이메일 주소 <span aria-hidden="true">*</span></label>
              <div className="email-field-row">
                <input className="field" id="mentee-email" type="email" name="email" autoComplete="email" placeholder="example@email.com" required />
                <button className="button button-soft email-verify-button" type="button">인증</button>
              </div>
            </div>

            <label className="signup-field-group">
              <span className="signup-field-label">소속 학교 <span aria-hidden="true">*</span></span>
              <input className="field" type="text" name="school" placeholder="학교명을 입력해 주세요" required />
            </label>

            <label className="signup-field-group">
              <span className="signup-field-label">전공 <span aria-hidden="true">*</span></span>
              <input className="field" type="text" name="major" placeholder="전공명을 입력해 주세요" required />
            </label>

            <fieldset className="signup-field-group student-status-fieldset">
              <legend className="signup-field-label">학년 · 재학 상태 <span aria-hidden="true">*</span></legend>
              <div className="student-status-row">
                <label>
                  <span className="sr-only">학년</span>
                  <select className="field" name="grade" defaultValue="" required>
                    <option value="" disabled>학년 선택</option>
                    <option value="1">1학년</option>
                    <option value="2">2학년</option>
                    <option value="3">3학년</option>
                    <option value="4">4학년</option>
                    <option value="5+">5학년 이상</option>
                  </select>
                </label>
                <label>
                  <span className="sr-only">재학 상태</span>
                  <select className="field" name="enrollmentStatus" defaultValue="" required>
                    <option value="" disabled>재학 상태 선택</option>
                    <option value="enrolled">재학</option>
                    <option value="leave">휴학</option>
                    <option value="graduated">졸업</option>
                    <option value="other">기타</option>
                  </select>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="mentee-signup-actions">
            <Link className="button button-neutral" to="/signup">이전</Link>
            <button className="button button-primary" type="submit">가입하기</button>
          </div>
        </form>
      </main>

      {isSignupComplete && (
        <div className="signup-complete-overlay">
          <section className="card signup-complete-card" role="status" aria-live="assertive">
            <div className="signup-complete-visual" aria-hidden="true">
              <svg viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="25" />
                <path d="m20 32 8 8 17-18" />
              </svg>
            </div>
            <p className="eyebrow">WELCOME, MENTEE</p>
            <h2 className="card-title">멘티 가입이 완료되었습니다</h2>
            <p className="muted-text">잠시 후 첫 화면으로 이동합니다.</p>
            <span className="signup-complete-progress" aria-hidden="true" />
          </section>
        </div>
      )}
    </div>
  );
}

export default MenteeSignupPage;
