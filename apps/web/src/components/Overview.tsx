import { overviewItems } from "../data/landingContent";

export function Overview() {
  return (
    <section className="my-[26px] grid grid-cols-4 overflow-hidden rounded-lg border border-ptop-line bg-ptop-paper max-[860px]:grid-cols-2 max-[560px]:grid-cols-1" aria-label="프로젝트 개요">
      {overviewItems.map(([label, value]) => (
        <div className="grid min-h-[118px] gap-2.5 border-r border-ptop-line bg-ptop-soft-paper p-5 last:border-r-0 max-[860px]:even:border-r-0 max-[560px]:border-r-0 max-[560px]:border-b max-[560px]:last:border-b-0" key={label}>
          <span className="text-[0.82rem] font-bold text-ptop-muted">{label}</span>
          <strong className="text-[1.03rem] leading-[1.45] text-ptop-ink">{value}</strong>
        </div>
      ))}
    </section>
  );
}
