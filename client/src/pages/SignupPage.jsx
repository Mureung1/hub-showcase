import { Link } from "react-router-dom";
import Brand from "../components/Brand";

const roles = [
  {
    id: "mentee",
    number: "01",
    audience: "학부생을 위한 선택",
    title: "멘티로 가입하기",
    description: "대학원 진학과 연구 분야에 대한 현실적인 조언을 받아보세요.",
    points: ["관심 분야 멘토 탐색", "사전 질문과 면담 신청"],
  },
  {
    id: "mentor",
    number: "02",
    audience: "대학원생을 위한 선택",
    title: "멘토로 가입하기",
    description: "나의 연구 경험과 진학 노하우로 멘티의 다음 선택을 도와주세요.",
    points: ["전공·연구실 프로필 등록", "멘티 질문 확인과 면담 관리"],
  },
];

function SignupPage() {
  return (
    <div className="signup-role-page">
      <header className="page-header signup-header">
        <Brand />
        <Link className="button button-neutral" to="/">첫 화면으로</Link>
      </header>

      <main className="page-container signup-role-container">
        <section className="signup-role-heading" aria-labelledby="signup-role-title">
          <p className="eyebrow">JOIN MENTORING</p>
          <h1 className="page-title" id="signup-role-title">회원 유형을 선택해 주세요</h1>
          <p className="body-text">지금 나에게 맞는 역할을 선택하면 해당 회원가입 화면으로 안내해 드려요.</p>
        </section>

        <section className="role-card-grid" aria-label="회원가입 역할 선택">
          {roles.map((role) => (
            <article className={`card role-card role-card-${role.id}`} key={role.id}>
              <div className="role-card-topline">
                <span className="role-number" aria-hidden="true">{role.number}</span>
                <span className="tag">{role.audience}</span>
              </div>
              <div className="role-card-copy">
                <h2 className="card-title">{role.title}</h2>
                <p className="body-text">{role.description}</p>
              </div>
              <ul className="role-point-list">
                {role.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
              <Link className="button button-primary role-button" to={`/signup/${role.id}`}>
                {role.id === "mentee" ? "멘티로 가입하기" : "멘토로 가입하기"}
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </section>

        <p className="signup-login-link">
          이미 계정이 있나요? <Link to="/#login">로그인하기</Link>
        </p>
      </main>
    </div>
  );
}

export default SignupPage;
