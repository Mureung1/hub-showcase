import type { ContentItem } from "../data/landingContent";

type FeatureListProps = {
  items: readonly ContentItem[];
  compact?: boolean;
};

export function FeatureList({ items, compact = false }: FeatureListProps) {
  return (
    <ul className={`grid list-none grid-cols-3 gap-2.5 p-0 max-[860px]:grid-cols-1 ${compact ? "[&>li]:min-h-28 [&>li]:border-ptop-mint-line [&>li]:bg-white/80" : ""}`}>
      {items.map(([title, description], index) => (
        <li className="relative grid min-h-[76px] content-start gap-2 rounded-lg border border-ptop-line bg-ptop-paper px-[18px] py-[18px] pl-[54px] leading-[1.52]" key={title}>
          <span className="absolute left-[18px] top-[18px] text-[0.78rem] font-extrabold text-ptop-mint-dark">{String(index + 1).padStart(2, "0")}</span>
          <strong className="block text-base font-extrabold leading-[1.25] text-ptop-ink">{title}</strong>
          <span className="block text-[0.92rem] leading-[1.55] text-[#4b4b4b] [word-break:keep-all]">{description}</span>
        </li>
      ))}
    </ul>
  );
}
