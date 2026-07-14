import React from "react";

export function FeatureList({ items, compact = false }) {
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
