import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { routePaths } from "../routes/routePaths";
import supabaseClient from "../api/supabaseClient";
import { setAccessToken } from "../utils/authStorage";
import { SCHOOL_EMAIL_HINT, SCHOOL_EMAIL_PATTERN } from "../constants/schoolEmail";

function MentorSignupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const savedAccount = location.state?.account ?? null;

  const [email, setEmail] = useState(savedAccount?.email ?? "");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("idle");
  const [verificationError, setVerificationError] = useState("");
  const isEmailVerified = verificationStatus === "verified";
  const emailInputRef = useRef(null);

  useEffect(() => {
    emailInputRef.current?.setCustomValidity(
      isEmailVerified ? "" : "이메일 인증을 완료해 주세요."
    );
  }, [isEmailVerified]);

  const handleSendVerificationCode = async () => {
    setVerificationError("");

    const trimmedEmail = email.trim();
    if (!SCHOOL_EMAIL_PATTERN.test(trimmedEmail)) {
      setVerificationError(SCHOOL_EMAIL_HINT);
      return;
    }
    if (!supabaseClient) {
      setVerificationError("이메일 인증 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setVerificationStatus("sending");

    const { error } = await supabaseClient.auth.signInWithOtp({
      email: trimmedEmail,
      options: { shouldCreateUser: true },
    });

    if (error) {
      setVerificationError(error.message);
      setVerificationStatus("idle");
      return;
    }

    setVerificationStatus("sent");
  };

  const handleVerifyCode = async () => {
    setVerificationError("");

    if (!verificationCode.trim()) {
      setVerificationError("인증 코드를 입력해 주세요.");
      return;
    }

    setVerificationStatus("verifying");

    const { data, error } = await supabaseClient.auth.verifyOtp({
      email: email.trim(),
      token: verificationCode.trim(),
      type: "email",
    });

    if (error || !data?.session) {
      setVerificationError(error?.message || "인증 코드가 올바르지 않습니다.");
      setVerificationStatus("sent");
      return;
    }

    setAccessToken(data.session.access_token);
    setVerificationStatus("verified");
  };

  const handleNext = (event) => {
    event.preventDefault();

    if (!isEmailVerified) {
      setVerificationError("이메일 인증을 완료해 주세요.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    navigate(routePaths.mentorSignupProfile, {
      state: {
        account: {
          name: formData.get("name"),
          nickname: formData.get("nickname"),
          password: formData.get("password"),
          email,
        },
      },
    });
  };

  return (
    <div className="mentor-signup-page">
      <header className="page-header signup-header">
        <Brand />
        <Link className="button button-neutral" to="/signup">역할 다시 선택</Link>
      </header>

      <main className="page-container mentor-signup-container">
        <section className="mentor-signup-heading" aria-labelledby="mentor-signup-title">
          <p className="eyebrow">MENTOR SIGN UP</p>
          <h1 className="page-title" id="mentor-signup-title">멘토 회원가입</h1>
          <p className="body-text">먼저 로그인에 사용할 계정 정보를 입력해 주세요.</p>
        </section>

        <form className="mentor-signup-form" onSubmit={handleNext}>
          <section className="card mentor-signup-section mentor-signup-section-accent" aria-labelledby="mentor-account-title">
            <div className="mentor-section-heading">
              <div className="mentor-section-title-row">
                <span className="mentor-section-number" aria-hidden="true">01</span>
                <div>
                  <p className="eyebrow">ACCOUNT</p>
                  <h2 className="card-title" id="mentor-account-title">개인정보 입력</h2>
                </div>
              </div>
              <p className="muted-text"><span aria-hidden="true">*</span> 표시는 필수 입력 항목입니다.</p>
            </div>

            <div className="mentor-field-list">
              <label className="mentor-field-group">
                <span className="mentor-field-label">이름 <span aria-hidden="true">*</span></span>
                <input
                  autoComplete="name"
                  className="field"
                  defaultValue={savedAccount?.name ?? ""}
                  name="name"
                  placeholder="이름을 입력해 주세요"
                  required
                  type="text"
                />
              </label>

              <label className="mentor-field-group">
                <span className="mentor-field-label">닉네임 <span aria-hidden="true">*</span></span>
                <input
                  autoComplete="nickname"
                  className="field"
                  defaultValue={savedAccount?.nickname ?? ""}
                  name="nickname"
                  placeholder="서비스에서 사용할 닉네임을 입력해 주세요"
                  required
                  type="text"
                />
              </label>

              <label className="mentor-field-group">
                <span className="mentor-field-label">비밀번호 <span aria-hidden="true">*</span></span>
                <input
                  autoComplete="new-password"
                  className="field"
                  defaultValue={savedAccount?.password ?? ""}
                  minLength="8"
                  name="password"
                  placeholder="8자 이상 입력해 주세요"
                  required
                  type="password"
                />
              </label>

              <div className="mentor-field-group">
                <label className="mentor-field-label" htmlFor="mentor-email">이메일 주소 <span aria-hidden="true">*</span></label>
                <small className="mentor-field-hint">{SCHOOL_EMAIL_HINT}</small>
                <div className="mentor-email-row">
                  <input
                    autoComplete="email"
                    className="field"
                    id="mentor-email"
                    name="email"
                    placeholder="example@school.ac.kr"
                    ref={emailInputRef}
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    readOnly={isEmailVerified}
                  />
                  <button
                    className="button button-soft mentor-email-button"
                    type="button"
                    onClick={handleSendVerificationCode}
                    disabled={isEmailVerified || verificationStatus === "sending"}
                  >
                    {isEmailVerified ? "인증 완료" : verificationStatus === "sending" ? "발송 중..." : "인증"}
                  </button>
                </div>

                {(verificationStatus === "sent" || verificationStatus === "verifying") && (
                  <div className="mentor-email-row">
                    <input
                      className="field"
                      type="text"
                      inputMode="numeric"
                      placeholder="인증 코드 8자리"
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.target.value)}
                    />
                    <button
                      className="button button-soft mentor-email-button"
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={verificationStatus === "verifying"}
                    >
                      {verificationStatus === "verifying" ? "확인 중..." : "확인"}
                    </button>
                  </div>
                )}

                {verificationError && (
                  <p className="signup-error" role="alert">{verificationError}</p>
                )}
              </div>
            </div>
          </section>

          <div className="mentor-signup-actions">
            <Link className="button button-neutral" to="/signup">이전</Link>
            <button className="button button-primary" type="submit">다음</button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default MentorSignupPage;
