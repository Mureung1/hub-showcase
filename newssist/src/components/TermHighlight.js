import { useState } from 'react';

// 본문 안에서 용어 하나를 감싸는 하이라이트. 클릭하면 바로 아래에 정의 툴팁이 뜬다 (추가 API 호출 없음 — terms는 이미 로드돼 있음)
export default function TermHighlight({ term, explanation, children }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline">
      <span
        role="button"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        className="bg-primary/10 border-b-2 border-primary/40 cursor-help hover:bg-primary/20 transition-all rounded-sm not-italic"
      >
        {children}
      </span>
      {open && (
        <span className="absolute z-20 top-full left-0 mt-2 w-72 p-stack-md bg-white border border-outline-variant rounded-lg shadow-lg not-italic inline-block">
          <span className="flex items-center gap-2 mb-stack-sm">
            <span
              className="material-symbols-outlined text-primary text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              info
            </span>
            <span className="font-label-mono text-label-mono text-primary font-bold uppercase">{term}</span>
          </span>
          <span className="font-body-md text-body-md text-on-surface block">{explanation}</span>
        </span>
      )}
    </span>
  );
}
