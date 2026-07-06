import { AUDIENCE_CHIPS, AUDIENCE_METRICS } from "../data";
import Reveal from "./Reveal";

export default function Audience() {
  return (
    <section className="section" id="audience">
      <div className="container">
        <Reveal className="audience">
          <span className="eyebrow">이런 곳에 맞습니다</span>
          <h2>유통기한이 있는 상품을 파는 모든 매장에</h2>
          <p className="audience-lead">
            신선식품이 많을수록, 매대가 다양할수록 효과가 큽니다. 규모가 작아도
            종이 장부 대신 화면 하나로 재고를 챙길 수 있어요.
          </p>

          <ul className="chips" aria-label="적합한 매장 유형">
            {AUDIENCE_CHIPS.map((c) => (
              <li className="chip" key={c}>
                {c}
              </li>
            ))}
          </ul>

          <dl className="metrics">
            {AUDIENCE_METRICS.map((m) => (
              <div className="metric" key={m.label}>
                <dt className="metric-value">{m.value}</dt>
                <dd className="metric-label">{m.label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
