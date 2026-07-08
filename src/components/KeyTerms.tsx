import type { ContextAnalysisResult } from "../types/context";

type KeyTermsProps = {
  terms: ContextAnalysisResult["keyTerms"];
};

function KeyTerms({ terms }: KeyTermsProps) {
  return (
    <section className="result-panel" aria-labelledby="terms-title">
      <div className="panel-heading compact">
        <p className="section-kicker">Key Terms</p>
        <h2 id="terms-title">핵심 용어</h2>
      </div>

      <div className="term-grid">
        {terms.map((item) => (
          <article key={item.term}>
            <strong>{item.term}</strong>
            <p>{item.meaning}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default KeyTerms;
