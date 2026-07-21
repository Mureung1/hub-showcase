import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { navigationTargets } from "../routes/routePaths";
import { setCurrentUserRole } from "../utils/authStorage";

function LoginCard() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    const formData = new FormData(event.currentTarget);

    setIsSubmitting(true);

    try {
      const response = await login({
        email: formData.get("email"),
        password: formData.get("password"),
      });
      const role = response.data.user.role;

      setCurrentUserRole(role);
      navigate(
        role === "mentee"
          ? navigationTargets.afterMenteeLogin
          : navigationTargets.afterMentorLogin,
        { replace: true },
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card login-card" id="login" aria-labelledby="login-title">
      <div className="login-heading">
        <p className="eyebrow">WELCOME BACK</p>
        <h2 className="card-title" id="login-title">멘토링을 시작해 볼까요?</h2>
        <p className="muted-text">계정으로 로그인하고 나에게 맞는 멘토를 만나보세요.</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <label className="field-group">
          <span>이메일</span>
          <input className="field" type="email" name="email" autoComplete="email" placeholder="name@example.com" required />
        </label>
        <label className="field-group">
          <span>비밀번호</span>
          <input className="field" type="password" name="password" autoComplete="current-password" placeholder="비밀번호를 입력해 주세요" required />
        </label>

        <p className="form-message" role="status" aria-live="polite">{message}</p>

        <div className="login-actions">
          <button className="button button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
          <Link className="button button-soft" to="/signup">회원가입</Link>
        </div>
      </form>
      <p className="login-note">아직 계정이 없다면 회원가입으로 시작해 주세요.</p>
    </section>
  );
}

export default LoginCard;
