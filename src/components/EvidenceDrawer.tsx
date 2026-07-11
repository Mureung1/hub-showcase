import { useEffect, useRef } from "react";
import type { EvidenceRef } from "../types/context";

type EvidenceDrawerProps = {
  evidence: EvidenceRef[] | null;
  onClose: () => void;
};

function EvidenceDrawer({ evidence, onClose }: EvidenceDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!evidence) return undefined;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [evidence, onClose]);

  if (!evidence) return null;

  return (
    <div className="drawer-backdrop">
      <button className="drawer-dismiss" type="button" aria-label="근거 패널 닫기" onClick={onClose} />
      <aside
        className="evidence-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-drawer-title"
      >
        <header>
          <div>
            <p className="section-kicker">Source evidence</p>
            <h2 id="evidence-drawer-title">분석 근거</h2>
          </div>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose}>
            닫기
          </button>
        </header>
        <p className="drawer-guide">
          분석 실행 당시 저장된 기록에서 실제로 확인된 문장입니다.
        </p>
        {evidence.length > 0 ? (
          <ol className="evidence-list">
            {evidence.map((item, index) => (
              <li key={`${item.sourceRecordId}-${index}`}>
                <span>{item.sourceTitle}</span>
                <blockquote>{item.quote}</blockquote>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-card">연결된 근거가 없습니다.</p>
        )}
      </aside>
    </div>
  );
}

export default EvidenceDrawer;
