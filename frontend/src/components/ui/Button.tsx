import { clsx } from "@/lib/clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "bg-surface text-body border border-line hover:border-[#D9DDE8]",
  ghost: "text-primary hover:bg-primary-soft px-2.5 py-2",
  danger: "bg-danger text-white hover:brightness-95",
};

/** 디자인.md 5.2 — 버튼 */
export function Button({ variant = "primary", block, className, ...props }: Props) {
  return (
    <button
      className={clsx(
        "rounded-btn text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant !== "ghost" && "px-[18px] py-2.5",
        VARIANTS[variant],
        block && "w-full",
        className,
      )}
      {...props}
    />
  );
}
