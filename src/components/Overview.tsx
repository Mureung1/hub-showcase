import { overviewItems } from "../data/landingContent";

export function Overview() {
  return (
    <section className="overview" aria-label="프로젝트 개요">
      {overviewItems.map(([label, value]) => (
        <div className="overview-item" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}
