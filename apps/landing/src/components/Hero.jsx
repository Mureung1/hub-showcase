import Reveal from "./Reveal";
import DemoCard from "./DemoCard";
import { MountainIcon, ArrowRight } from "./Icons";

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero-grid">
        <Reveal>
          <span className="eyebrow">
            <MountainIcon size={14} /> 바코드 스캔 재고·유통기한 관리
          </span>

          <h1>
            찍기만 하세요, <br />
            <span className="accent">나머지는 셰르파가</span>
          </h1>

          <p className="hero-lead">
            바코드를 찍으면 등록할지 조회할지 알아서 정해요. 입고할 때마다
            수량과 유통기한만 더하면, 먼저 빼야 할 상품을 색으로 알려줍니다.
            설치도 서버도 없이 브라우저 하나로.
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
