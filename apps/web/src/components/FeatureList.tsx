import type { ContentItem } from "../data/landingContent";

type FeatureListProps = {
  items: readonly ContentItem[];
  compact?: boolean;
};

export function FeatureList({ items, compact = false }: FeatureListProps) {
  return (
    <ul className={`feature-list${compact ? " compact" : ""}`}>
      {items.map(([title, description]) => (
        <li key={title}>
          <strong className="feature-title">{title}</strong>
          <span className="feature-desc">{description}</span>
        </li>
      ))}
    </ul>
  );
}
