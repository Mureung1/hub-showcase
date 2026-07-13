import { Link } from "react-router-dom";
import Brand from "../components/Brand";
import LoginCard from "../components/LoginCard";

const services = [
  { number: "01", title: "관심 분야 탐색", description: "전공과 연구 키워드를 기준으로 나와 맞는 멘토를 찾아보세요." },
  { number: "02", title: "진학·연구실 정보", description: "대학원 생활과 연구실 선택에 필요한 생생한 정보를 나눠요." },
  { number: "03", title: "포인트 충전", description: "간편하게 포인트를 준비하고 원하는 멘토링을 신청해요." },
];

function LandingPage() {
  return (
    <>
      <header className="page-header site-header">
        <Brand />
        <nav className="header-actions" aria-label="회원 메뉴">
          <a className="button button-neutral" href="#login">로그인</a>
          <Link className="button button-primary" to="/signup">회원가입</Link>
        </nav>
      </header>

      <main>
        <section className="page-container intro-section" aria-labelledby="intro-title">
          <div className="intro-copy">
            <p className="eyebrow">대학원생 멘토 매칭 서비스</p>
            <h1 className="page-title" id="intro-title">선배와의 만남이<br />내일의 방향이 됩니다</h1>
            <p className="body-text intro-description">
              대학원생 멘토와 1:1로 만나 진로와 연구에 대한<br className="desktop-only" /> 고민을 함께 해결해 보세요.
            </p>
            <ul className="intro-points" aria-label="서비스 특징">
              <li>관심 전공과 연구 분야에 맞는 멘토</li>
              <li>경험에서 나오는 현실적인 조언</li>
            </ul>
          </div>
          <LoginCard />
        </section>

        <section className="service-section" aria-labelledby="service-title">
          <div className="page-container service-container">
            <div className="section-heading">
              <p className="eyebrow">MENTORING SERVICE</p>
              <h2 className="section-title" id="service-title">나에게 필요한 조언을 더 가까이</h2>
              <p className="muted-text">막연했던 질문을 실제 경험이 있는 선배와 구체적으로 풀어가세요.</p>
            </div>
            <div className="service-grid">
              {services.map((service) => (
                <article className="service-item" key={service.number}>
                  <span className="service-icon" aria-hidden="true">{service.number}</span>
                  <h3 className="card-title">{service.title}</h3>
                  <p className="muted-text">{service.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-container footer-inner">
          <Brand footer />
          <p>대학원 진로의 막막함을 연결로 바꿉니다.</p>
          <p>© 2026 MentorING</p>
        </div>
      </footer>
    </>
  );
}

export default LandingPage;
