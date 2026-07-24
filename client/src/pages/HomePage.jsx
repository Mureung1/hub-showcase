import Header from '../components/Header';
import './HomePage.css';

const FEATURES = [
  {
    title: '졸업요건 계산',
    desc: '학과별 졸업요건을 자동으로 불러와 총학점·전공·교양 충족률을 한눈에 확인해요.',
  },
  {
    title: '수강 바구니',
    desc: '관심 있는 과목을 담아보며 이번 학기 수강 계획을 가볍게 세워보세요.',
  },
  {
    title: '미래 학기 시뮬레이션',
    desc: '졸업까지 남은 학기 동안 학기별로 몇 학점씩 들어야 하는지 미리 계산해드려요.',
  },
  {
    title: 'AI 챗봇 추천',
    desc: '궁금한 점을 챗봇에게 물어보고 내 상황에 맞는 수강 추천을 받아보세요.',
  },
];

function HomePage() {
  return (
    <div className="home-page">
      <Header />

      <section className="hero-landing">
        <div className="hero-landing-content">
          <div className="hero-title-wrap">
            <div className="hero-title-glow" aria-hidden="true" />
            <h1 className="hero-landing-title">ConGraduation</h1>
          </div>
          <p className="hero-landing-tagline">
            졸업요건 확인부터 AI 수강 추천까지, 한 곳에서 끝내는 졸업 설계 서비스
          </p>
        </div>

        <div className="hero-landing-fade" aria-hidden="true" />
      </section>

      <section className="intro-section">
        <p className="eyebrow">About ConGraduation</p>
        <h2 className="intro-title">졸업까지 필요한 모든 계획을 한 곳에서</h2>

        <div className="intro-feature-grid">
          {FEATURES.map((feature) => (
            <div className="card intro-feature-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p className="sub">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
