import { PROBLEMS } from "../data";
import Reveal from "./Reveal";

export default function Problems() {
  return (
    <section className="section" id="problem">
      <div className="container">
        <Reveal className="section-head center">
          <span className="eyebrow">왜 필요한가</span>
          <h2 className="section-title" style={{ marginTop: 16 }}>
            복잡한 POS, 재고·유통기한만 쓰기엔 너무 무겁습니다
          </h2>
          <p className="section-desc">
            소규모 매장에서 흔히 겪는 세 가지 문제. 작은 누수가 쌓이면 매출을
            갉아먹습니다.
          </p>
        </Reveal>

        <div className="grid grid-3">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.title} style={{ transitionDelay: `${i * 0.08}s` }}>
              <article className="card">
                <div className="card-icon" aria-hidden="true">
                  {p.emoji}
                </div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
