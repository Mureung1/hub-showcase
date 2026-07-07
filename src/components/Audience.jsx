import { AUDIENCE_CHIPS, AUDIENCE_METRICS } from "../data";
import Reveal from "./Reveal";

export default function Audience() {
  return (
    <section className="section" id="audience">
      <div className="container">
        <Reveal className="audience">
          <span className="eyebrow">이런 곳에 맞습니다</span>
          <h2>매뉴얼 없이 쓰는 소규모 마트 사장님을 위해</h2>
          <p className="audience-lead">
            POS 교육을 따로 받지 않아도 됩니다. 가끔 재고를 정리하는 가족 운영
            매장일수록, 복잡한 설정보다 “찍으면 알아서 되는” 단순함이 필요해요.
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
