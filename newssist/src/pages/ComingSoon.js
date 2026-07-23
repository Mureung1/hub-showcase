export default function ComingSoon({ title, description }) {
  return (
    <div className="max-w-5xl mx-auto px-container-padding py-stack-lg">
      <h1 className="font-headline-md text-headline-md text-on-surface mb-stack-sm">{title}</h1>
      <p className="font-body-md text-body-md text-on-surface-variant">{description}</p>
    </div>
  );
}
