import { clsx } from "@/lib/clsx";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const CONTROL =
  "w-full rounded-btn border border-line bg-surface px-3.5 py-2.5 text-strong outline-none transition-shadow focus:border-primary focus:shadow-[0_0_0_3px_rgba(76,111,255,0.15)]";

export function Field({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={clsx("mb-4 block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-body">{label}</span>
      <input className={CONTROL} {...props} />
    </label>
  );
}

export function TextField({
  label,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className={clsx("mb-4 block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-body">{label}</span>
      <textarea className={CONTROL} {...props} />
    </label>
  );
}
