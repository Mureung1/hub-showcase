import type { ContextAnalysisResult, NodeType } from "../types/context";

type KnowledgeMapProps = {
  map: ContextAnalysisResult["knowledgeMap"];
};

const nodePositions: Record<string, { x: number; y: number }> = {
  topic: { x: 260, y: 78 },
  decision: { x: 452, y: 188 },
  "person-seojun": { x: 104, y: 188 },
  "person-hyunwoo": { x: 186, y: 320 },
  question: { x: 390, y: 320 },
};

const nodeTone: Record<NodeType, string> = {
  topic: "node-topic",
  person: "node-person",
  role: "node-role",
  decision: "node-decision",
  question: "node-question",
};

function KnowledgeMap({ map }: KnowledgeMapProps) {
  return (
    <section className="result-panel map-panel" aria-labelledby="map-title">
      <div className="panel-heading compact">
        <p className="section-kicker">Shared Knowledge Map</p>
        <h2 id="map-title">공유 지식맵</h2>
      </div>

      <svg className="knowledge-svg" viewBox="0 0 560 380" role="img" aria-label="프로젝트 맥락 노드 연결 지도">
        {map.links.map((link) => {
          const from = nodePositions[link.from];
          const to = nodePositions[link.to];

          if (!from || !to) {
            return null;
          }

          return (
            <g key={`${link.from}-${link.to}`}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
              <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8}>
                {link.relation}
              </text>
            </g>
          );
        })}

        {map.nodes.map((node) => {
          const position = nodePositions[node.id];

          if (!position) {
            return null;
          }

          return (
            <g key={node.id} className={nodeTone[node.type]} transform={`translate(${position.x} ${position.y})`}>
              <circle r="54" />
              <text className="node-label" textAnchor="middle" y="-4">
                {node.label}
              </text>
              <text className="node-type" textAnchor="middle" y="20">
                {node.type}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

export default KnowledgeMap;
