import type { ContextAnalysisResult, KnowledgeNode, NodeType } from "../types/context";

type KnowledgeMapProps = {
  map: ContextAnalysisResult["knowledgeMap"];
};

type NodePosition = { x: number; y: number };

const MAP_WIDTH = 820;
const MAP_MIN_HEIGHT = 480;
const MAP_VERTICAL_PADDING = 82;

const nodeLane: Record<NodeType, number> = {
  person: 92,
  role: 245,
  topic: 410,
  decision: 575,
  question: 728,
};

const nodeTone: Record<NodeType, string> = {
  topic: "node-topic",
  person: "node-person",
  role: "node-role",
  decision: "node-decision",
  question: "node-question",
};

const nodeTypeLabel: Record<NodeType, string> = {
  topic: "주제",
  person: "참여자",
  role: "역할",
  decision: "결정",
  question: "질문",
};

function KnowledgeMap({ map }: KnowledgeMapProps) {
  const { height, positions } = buildNodeLayout(map.nodes);

  if (map.nodes.length === 0) {
    return (
      <section className="result-panel map-panel" aria-labelledby="map-title">
        <div className="panel-heading compact">
          <p className="section-kicker">Shared Knowledge Map</p>
          <h2 id="map-title">공유 지식맵</h2>
        </div>
        <p className="knowledge-empty">분석 결과에서 표시할 지식맵 노드를 찾지 못했습니다.</p>
      </section>
    );
  }

  return (
    <section className="result-panel map-panel" aria-labelledby="map-title">
      <div className="panel-heading compact">
        <p className="section-kicker">Shared Knowledge Map</p>
        <h2 id="map-title">공유 지식맵</h2>
      </div>

      <svg
        className="knowledge-svg"
        viewBox={`0 0 ${MAP_WIDTH} ${height}`}
        role="img"
        aria-label={`${map.nodes.length}개 노드와 ${map.links.length}개 연결로 구성된 프로젝트 맥락 지도`}
      >
        {map.links.map((link, linkIndex) => {
          const from = positions.get(link.from);
          const to = positions.get(link.to);

          if (!from || !to) {
            return null;
          }

          return (
            <g key={`${link.from}-${link.to}-${linkIndex}`}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
              <text className="link-label" x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 9} textAnchor="middle">
                {link.relation}
              </text>
            </g>
          );
        })}

        {map.nodes.map((node) => {
          const position = positions.get(node.id);

          if (!position) {
            return null;
          }

          return (
            <g key={node.id} className={nodeTone[node.type]} transform={`translate(${position.x} ${position.y})`}>
              <title>{`${node.label}: ${node.summary}`}</title>
              <circle r="50" />
              <text className="node-label" textAnchor="middle" y={getLabelLines(node.label).length > 1 ? -11 : -3}>
                {getLabelLines(node.label).map((line, lineIndex) => (
                  <tspan x="0" dy={lineIndex === 0 ? 0 : 15} key={`${line}-${lineIndex}`}>
                    {line}
                  </tspan>
                ))}
              </text>
              <text className="node-type" textAnchor="middle" y="29">
                {nodeTypeLabel[node.type]}
              </text>
            </g>
          );
        })}
      </svg>

      <ul className="knowledge-details" aria-label="지식맵 노드 상세">
        {map.nodes.map((node) => (
          <li key={`detail-${node.id}`}>
            <span className={`node-chip ${nodeTone[node.type]}`}>{nodeTypeLabel[node.type]}</span>
            <div>
              <strong>{node.label}</strong>
              <p>{node.summary}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function buildNodeLayout(nodes: KnowledgeNode[]) {
  const nodesByType = new Map<NodeType, KnowledgeNode[]>();

  for (const node of nodes) {
    const laneNodes = nodesByType.get(node.type) || [];
    laneNodes.push(node);
    nodesByType.set(node.type, laneNodes);
  }

  const largestLane = Math.max(1, ...[...nodesByType.values()].map((laneNodes) => laneNodes.length));
  const height = Math.max(MAP_MIN_HEIGHT, largestLane * 132 + MAP_VERTICAL_PADDING);
  const positions = new Map<string, NodePosition>();

  for (const [type, laneNodes] of nodesByType) {
    laneNodes.forEach((node, index) => {
      const availableHeight = height - MAP_VERTICAL_PADDING * 2;
      const y =
        laneNodes.length === 1
          ? height / 2
          : MAP_VERTICAL_PADDING + (availableHeight * index) / (laneNodes.length - 1);

      positions.set(node.id, { x: nodeLane[type], y });
    });
  }

  return { height, positions };
}

function getLabelLines(label: string) {
  const compactLabel = label.replace(/\s+/g, " ").trim();
  const firstLine = compactLabel.slice(0, 8);

  if (compactLabel.length <= 8) return [firstLine];

  const remaining = compactLabel.slice(8);
  const secondLine = remaining.length > 8 ? `${remaining.slice(0, 7)}…` : remaining;
  return [firstLine, secondLine];
}

export default KnowledgeMap;
