type OnboardingSummaryProps = {
  items: string[];
};

function OnboardingSummary({ items }: OnboardingSummaryProps) {
  return (
    <section className="result-panel" aria-labelledby="onboarding-title">
      <div className="panel-heading compact">
        <p className="section-kicker">For New Teammates</p>
        <h2 id="onboarding-title">새 팀원 온보딩 요약</h2>
      </div>

      <ol className="onboarding-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
  );
}

export default OnboardingSummary;
