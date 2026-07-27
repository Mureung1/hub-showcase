import { useState } from "react";
import MarkdownViewer from "./MarkdownViewer";
import MarkdownEditor from "./MarkdownEditor";

export interface AnalysisStats {
  dependencyCount: number;
  duplicateCount: number;
  refactorTargetCount: number;
}

interface Props {
  stats: AnalysisStats;
  report: string;
  onApprove: () => void;
}

export default function AnalysisReportCard({ stats, report, onApprove }: Props) {
  const [content, setContent] = useState(report);
  const [draft, setDraft] = useState(report);
  const [isEditing, setIsEditing] = useState(false);

  function handleEdit() {
    setDraft(content);
    setIsEditing(true);
  }
  function handleSave() {
    setContent(draft);
    setIsEditing(false);
  }
  function handleCancel() {
    setIsEditing(false);
  }

  return (
    <div className="card" style={{ maxWidth: 620, margin: "0 auto" }}>
      <div className="card-head">
        <span className="label-mono" style={{ margin: 0 }}>
          00_Analysis_Report.md
        </span>
        <span className="badge success">분석 완료</span>
      </div>

      <div className="card-body">
        <div className="stat-grid">
          <div className="stat">
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>클래스 의존성</div>
            <div className="n">{stats.dependencyCount}</div>
          </div>
          <div className="stat">
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>중복 코드 블록</div>
            <div className="n" style={{ color: "var(--amber)" }}>
              {stats.duplicateCount}
            </div>
          </div>
          <div className="stat">
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>리팩토링 대상</div>
            <div className="n" style={{ color: "var(--red)" }}>
              {stats.refactorTargetCount}
            </div>
          </div>
        </div>

        {isEditing ? (
          <MarkdownEditor value={draft} onChange={setDraft} />
        ) : (
          <MarkdownViewer content={content} />
        )}
      </div>

      <div className="card-foot" style={{ justifyContent: "space-between" }}>
        {isEditing ? (
          <>
            <button onClick={handleCancel}>취소</button>
            <button className="primary" onClick={handleSave}>
              저장
            </button>
          </>
        ) : (
          <>
            <button onClick={handleEdit}>✎ 원문 수정</button>
            <button className="primary" onClick={onApprove}>
              Approve하고 Requirements Agent로 →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
