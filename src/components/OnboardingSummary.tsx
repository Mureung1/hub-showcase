import type { OnboardingSummary as Summary } from "../types/context";

function OnboardingSummary({ summary }: { summary: Summary }) {
  return <section className="result-panel" aria-labelledby="onboarding-title"><div className="panel-heading compact"><p className="section-kicker">For new teammates</p><h2 id="onboarding-title">새 팀원 온보딩 요약</h2></div><ol className="onboarding-list">{summary.items.map((item) => <li key={item}>{item}</li>)}</ol><div className="onboarding-share"><strong>공유 문장</strong><p>{summary.shareText}</p></div></section>;
}

export default OnboardingSummary;
