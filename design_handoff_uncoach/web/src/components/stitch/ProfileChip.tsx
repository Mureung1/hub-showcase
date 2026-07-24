"use client";

/** 모든 화면 오른쪽 상단에 동일하게 쓰는 프로필 칩. */
export default function ProfileChip({ name }: { name?: string }) {
  const initial = (name || "나").trim().charAt(0) || "나";
  return (
    <button className="flex items-center gap-2 pl-2 md:pl-3 border-l border-border-light">
      <span className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">{initial}</span>
      <span className="hidden sm:block font-label-sm text-label-sm font-medium text-on-surface">{name || "프로필"}</span>
    </button>
  );
}
