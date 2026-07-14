import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { ME } from "@/lib/mock";

export function Topbar({ back }: { back?: { href: string; label: string } }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-line bg-surface px-5 md:px-8">
      {back ? (
        <Link href={back.href} className="rounded-btn px-2 py-2 text-sm font-semibold text-primary hover:bg-primary-soft">
          ← {back.label}
        </Link>
      ) : (
        <div className="flex max-w-90 flex-1 items-center gap-2 rounded-btn border border-line bg-bg px-3 py-2 text-muted">
          <span aria-hidden>🔍</span>
          <input
            aria-label="회사·직무 검색"
            placeholder="회사·직무 검색"
            className="flex-1 bg-transparent text-body outline-none"
          />
        </div>
      )}
      <div className="ml-auto flex items-center gap-2 text-[13px] font-semibold text-strong">
        <Avatar initials={ME.initials} />
        {ME.name}
      </div>
    </header>
  );
}
