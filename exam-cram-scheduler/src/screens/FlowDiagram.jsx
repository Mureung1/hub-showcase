export default function FlowDiagram() {
  return (
    <div className="page-col">
      <div className="page-header">
        <h1>화면 흐름</h1>
        <p>홈 → 정보 입력 → 처리 중 → 결과 → (필요 시) 스케줄 조정 → 재계산</p>
      </div>
      <div style={{ background: '#fff', border: '1px solid #d7dbe0', borderRadius: 12, padding: 24 }}>
        <svg viewBox="0 0 980 300" width="100%" role="img" aria-label="화면 흐름도">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#4b5563" />
            </marker>
          </defs>

          {[
            { x: 20, label: '홈' },
            { x: 210, label: '정보 입력' },
            { x: 400, label: '처리 중' },
            { x: 590, label: '결과' },
            { x: 780, label: '스케줄 조정' },
          ].map((box) => (
            <g key={box.label}>
              <rect x={box.x} y="120" width="160" height="60" rx="10"
                fill="#f6f7f9" stroke="#9aa1ab" strokeDasharray="4 3" strokeWidth="1.5" />
              <text x={box.x + 80} y="155" textAnchor="middle" fontSize="14" fill="#1f2937">
                {box.label}
              </text>
            </g>
          ))}

          {[20, 210, 400, 590].map((x) => (
            <line key={x} x1={x + 160} y1="150" x2={x + 210 - 20} y2="150"
              stroke="#4b5563" strokeWidth="1.5" markerEnd="url(#arrow)" />
          ))}

          <path d="M 860 180 C 860 240, 480 240, 480 180"
            fill="none" stroke="#4b5563" strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#arrow)" />
          <text x="670" y="262" textAnchor="middle" fontSize="12" fill="#6b7280">
            조건 변경 시 재계산 → 결과 화면으로 되돌아감
          </text>
        </svg>
      </div>
    </div>
  )
}
