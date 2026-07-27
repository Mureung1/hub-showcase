type SectionHeadingProps = {
  label: string;
  title: string;
};

export function SectionHeading({ label, title }: SectionHeadingProps) {
  return (
    <div className="mb-[22px] flex items-start justify-between gap-6 border-b border-ptop-line pb-[18px]">
      <span className="mb-3 block text-[0.78rem] font-extrabold uppercase text-ptop-mint-dark">{label}</span>
      <h2 className="max-w-[620px] text-[clamp(1.6rem,3.4vw,2.5rem)] tracking-[-0.035em]">{title}</h2>
    </div>
  );
}
