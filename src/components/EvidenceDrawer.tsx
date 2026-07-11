import { useEffect, useRef } from "react";
import type { EvidenceRef } from "../types/context";
import type { SourceSegmentResource } from "../types/platform";

type EvidenceDrawerProps = {
  evidence: EvidenceRef[] | null;
  segments?: SourceSegmentResource[];
  segmentsLoading?: boolean;
  onClose: () => void;
};

function EvidenceDrawer({ evidence, segments = [], segmentsLoading = false, onClose }: EvidenceDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!evidence) return undefined;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      openerRef.current?.focus();
    };
  }, [evidence, onClose]);

  if (!evidence) return null;

  return (
    <div className="drawer-backdrop">
      <button className="drawer-dismiss" type="button" aria-label="근거 패널 닫기" onClick={onClose} />
      <aside
        ref={drawerRef}
        className="evidence-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-drawer-title"
        aria-describedby="evidence-drawer-guide"
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
        <p id="evidence-drawer-guide" className="drawer-guide">
          분석 실행 당시 저장된 기록에서 실제로 확인된 문장입니다.
        </p>
        {segmentsLoading && <p className="evidence-link-status" role="status">원본 위치를 찾는 중…</p>}
        {evidence.length > 0 ? (
          <ol className="evidence-list">
            {evidence.map((item, index) => {
              const segment = findMatchingSegment(item, segments);
              return (
                <li key={`${item.sourceRecordId}-${index}`}>
                  <span>{item.sourceTitle}</span>
                  <blockquote>{item.quote}</blockquote>
                  {segment && (
                    <div className="evidence-segment-meta">
                      <span>
                        {[segment.speaker, formatSegmentTime(segment.occurredAt)]
                          .filter(Boolean)
                          .join(" · ") || `원문 ${segment.ordinal + 1}번째 맥락`}
                      </span>
                      {segment.sourceUrl && (
                        <a href={segment.sourceUrl} target="_blank" rel="noreferrer">
                          외부 원문 위치 열기
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="empty-card">연결된 근거가 없습니다.</p>
        )}
      </aside>
    </div>
  );
}

function findMatchingSegment(evidence: EvidenceRef, segments: SourceSegmentResource[]) {
  const matches = segments.filter((segment) =>
    segment.sourceRecordId === evidence.sourceRecordId &&
    segment.text.includes(evidence.quote),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function formatSegmentTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

export default EvidenceDrawer;
