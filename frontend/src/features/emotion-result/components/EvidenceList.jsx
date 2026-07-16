import React from "react";

export default function EvidenceList({ evidence = [] }) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return <p className="empty-evidence">표시할 판단 근거가 없습니다.</p>;
  }

  return (
    <ul>
      {evidence.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}
