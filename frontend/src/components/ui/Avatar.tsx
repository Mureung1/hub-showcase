import { clsx } from "@/lib/clsx";

export function Avatar({
  initials,
  size = 32,
  className,
}: {
  initials: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={clsx(
        "grid shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary",
        className,
      )}
    >
      {initials}
    </span>
  );
}
