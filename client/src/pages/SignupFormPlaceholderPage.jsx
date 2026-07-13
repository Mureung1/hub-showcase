import { Link } from "react-router-dom";

const roleCopy = {
  mentee: { eyebrow: "MENTEE SIGN UP", title: "멘티 회원가입", description: "멘티 정보 입력 화면은 다음 개발 단계에서 연결됩니다." },
  mentor: { eyebrow: "MENTOR SIGN UP", title: "멘토 회원가입", description: "멘토 정보와 프로필 입력 화면은 다음 개발 단계에서 연결됩니다." },
};

function SignupFormPlaceholderPage({ role }) {
  const copy = roleCopy[role];

  return (
    <main className="placeholder-page">
      <section className="card placeholder-card">
        <span className="brand-mark" aria-hidden="true">M</span>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-text">{copy.description}</p>
        <div className="placeholder-actions">
          <Link className="button button-neutral" to="/signup">역할 다시 선택하기</Link>
          <Link className="button button-primary" to="/">첫 화면으로</Link>
        </div>
      </section>
    </main>
  );
}

export default SignupFormPlaceholderPage;
