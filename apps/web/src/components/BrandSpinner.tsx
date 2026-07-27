export function BrandSpinner() {
  return (
    <div className="relative grid h-[54px] w-[54px] shrink-0 place-items-center" aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,var(--mint),var(--mint-dark),transparent_70%)] animate-[spin_1s_linear_infinite]" />
      <span className="relative h-10 w-10 rounded-full bg-ptop-paper" />
    </div>
  );
}
