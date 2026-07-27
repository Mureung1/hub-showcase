import { resourceLinks } from "../data/landingContent";
import { SectionHeading } from "./SectionHeading";

export function ResourceLinks() {
  return (
    <section className="mt-[18px] rounded-lg border border-ptop-mint-line bg-ptop-mint-soft p-7 text-ptop-ink">
      <SectionHeading label="05 Resources" title="기획 문서와 프로토타입" />
      <div className="grid grid-cols-3 gap-3 max-[860px]:grid-cols-1">
        {resourceLinks.map(([title, href, description]) => (
          <a className="grid min-h-[116px] gap-2.5 rounded-lg border border-ptop-mint-line bg-white/70 p-5 text-ptop-ink no-underline transition-colors hover:border-ptop-mint" href={href} key={title}>
            <strong className="text-[1.05rem]">{title}</strong>
            <span className="text-[0.92rem] leading-[1.55] text-ptop-muted">{description}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
