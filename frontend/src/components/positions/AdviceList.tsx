/** 디자인.md 6.4 — "내 이력으로 맞추는 방향". 순번이 우선순위를 뜻하므로 번호를 쓴다. */
export function AdviceList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((text, i) => (
        <li key={i} className="flex gap-3 rounded-xl bg-info-soft p-3.5">
          <span className="grid h-5.5 w-5.5 shrink-0 place-items-center rounded-[7px] bg-info text-xs font-bold text-white">
            {i + 1}
          </span>
          <p className="text-[13px] leading-relaxed text-[#4A3F7A]">{text}</p>
        </li>
      ))}
    </ol>
  );
}
