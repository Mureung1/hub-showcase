import { Link, useLocation, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { routePaths } from "../routes/routePaths";

function MentorSignupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const savedAccount = location.state?.account ?? null;

  const handleNext = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    navigate(routePaths.mentorSignupProfile, {
      state: {
        account: {
          name: formData.get("name"),
          nickname: formData.get("nickname"),
          password: formData.get("password"),
          email: formData.get("email"),
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
          <section className="card mentor-signup-section" aria-labelledby="mentor-account-title">
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
                <div className="mentor-email-row">
                  <input
                    autoComplete="email"
                    className="field"
                    defaultValue={savedAccount?.email ?? ""}
                    id="mentor-email"
                    name="email"
                    placeholder="example@email.com"
                    required
                    type="email"
                  />
                  <button className="button button-soft mentor-email-button" type="button">인증</button>
                </div>
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
