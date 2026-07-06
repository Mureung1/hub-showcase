import { FEATURES } from "../data";
import Reveal from "./Reveal";

export default function Features() {
  return (
    <section className="section" id="features">
      <div className="container">
        <Reveal className="section-head center">
          <span className="eyebrow">핵심 기능</span>
          <h2 className="section-title" style={{ marginTop: 16 }}>
            등록부터 알림까지, 한 화면에서
          </h2>
          <p className="section-desc">
            재고 관리에 꼭 필요한 기능만 담았습니다. 별도 교육 없이 바로 쓸 수
            있어요.
          </p>
        </Reveal>

        <div className="grid grid-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} style={{ transitionDelay: `${(i % 3) * 0.07}s` }}>
              <article className="card">
                <div className="card-icon" aria-hidden="true">
                  {f.emoji}
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
