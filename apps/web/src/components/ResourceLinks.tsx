import { resourceLinks } from "../data/landingContent";
import { SectionHeading } from "./SectionHeading";

export function ResourceLinks() {
  return (
    <section className="feature-section resource-section">
      <SectionHeading label="05 Resources" title="기획 문서와 프로토타입" />
      <div className="resource-grid">
        {resourceLinks.map(([title, href, description]) => (
          <a className="resource-card" href={href} key={title}>
            <strong>{title}</strong>
            <span>{description}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
