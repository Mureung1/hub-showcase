type SectionHeadingProps = {
  label: string;
  title: string;
};

export function SectionHeading({ label, title }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <span className="section-label">{label}</span>
      <h2>{title}</h2>
    </div>
  );
}
