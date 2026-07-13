import { Link } from "react-router-dom";

function SignupPage() {
  return (
    <main className="placeholder-page">
      <section className="card placeholder-card">
        <span className="brand-mark" aria-hidden="true">M</span>
        <p className="eyebrow">MENTORING</p>
        <h1 className="page-title">회원가입 화면을 준비하고 있어요</h1>
        <p className="body-text">다음 단계에서 멘티와 멘토 역할 선택 화면으로 연결됩니다.</p>
        <Link className="button button-primary" to="/">첫 화면으로 돌아가기</Link>
      </section>
    </main>
  );
}

export default SignupPage;
