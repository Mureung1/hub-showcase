import { STEPS } from "../data";
import Reveal from "./Reveal";
import { ArrowRight } from "./Icons";

export default function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <Reveal className="section-head center">
          <span className="eyebrow">작동 방식</span>
          <h2 className="section-title" style={{ marginTop: 16 }}>
            스캔하면, 알아서 흘러갑니다
          </h2>
          <p className="section-desc">
            복잡한 설정도 모드 전환도 없습니다. 바코드만 찍으면 나머지는 셰르파가
            챙겨요.
          </p>
        </Reveal>

        <ol className="steps">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.no} className="step" style={{ transitionDelay: `${i * 0.1}s` }}>
              <span className="step-no mono" aria-hidden="true">
                {s.no}
              </span>
              <div className="step-emoji" aria-hidden="true">
                {s.emoji}
              </div>
              <h3>
                <span className="sr-only">{s.no}단계. </span>
                {s.title}
              </h3>
              <p>{s.desc}</p>
              {i < STEPS.length - 1 && (
                <span className="step-arrow" aria-hidden="true">
                  <ArrowRight size={22} />
                </span>
              )}
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
