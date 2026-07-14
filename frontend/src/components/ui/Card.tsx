import { clsx } from "@/lib/clsx";
import type { HTMLAttributes } from "react";

/** 디자인.md 5.3 — 카드 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("rounded-card border border-line bg-surface p-6 shadow-card", className)}
      {...props}
    />
  );
}
