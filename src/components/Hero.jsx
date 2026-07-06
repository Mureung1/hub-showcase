import Reveal from "./Reveal";
import DemoCard from "./DemoCard";
import { LeafIcon, ArrowRight } from "./Icons";

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero-grid">
        <Reveal>
          <span className="eyebrow">
            <LeafIcon size={14} /> 마트 재고 · 유통기한 관리 서비스
          </span>

          <h1>
            유통기한, <br />
            <span className="accent">놓치지 마세요</span>
          </h1>

          <p className="hero-lead">
            매대를 일일이 확인하지 않아도 됩니다. 상품을 등록하면 남은 날짜를
            스스로 계산해, 임박·만료 상품을 먼저 알려줘요. 버려지는 상품을 줄이는
            가장 쉬운 방법.
          </p>

          <div className="hero-actions">
            <a className="btn btn-primary" href="#features">
              기능 살펴보기 <ArrowRight size={16} />
            </a>
            <a className="btn btn-ghost" href="#how">
              작동 방식 보기
            </a>
          </div>

          <p className="hero-note">
            로그인 없이 둘러보는 아이디어 소개 페이지입니다.
          </p>
        </Reveal>

        <Reveal style={{ transitionDelay: "0.12s" }}>
          <DemoCard />
        </Reveal>
      </div>
    </section>
  );
}
