import type { ContextAnalysisResult, KnowledgeNode, NodeType } from "../types/context";

type NodePosition = { x: number; y: number };
const WIDTH = 820;
const MIN_HEIGHT = 480;
const PADDING = 82;
const lane: Record<NodeType, number> = { person: 92, role: 245, topic: 410, decision: 575, question: 728 };
const tone: Record<NodeType, string> = { topic: "node-topic", person: "node-person", role: "node-role", decision: "node-decision", question: "node-question" };
const labels: Record<NodeType, string> = { topic: "주제", person: "참여자", role: "역할", decision: "결정", question: "질문" };

function KnowledgeMap({ map }: { map: ContextAnalysisResult["knowledgeMap"] }) {
  const { height, positions } = buildLayout(map.nodes);
  return <section className="result-panel map-panel" aria-labelledby="map-title"><div className="panel-heading compact"><p className="section-kicker">Shared knowledge map</p><h2 id="map-title">공유 지식맵</h2></div>{map.nodes.length === 0 ? <p className="knowledge-empty">분석 결과에서 표시할 지식맵 노드를 찾지 못했습니다.</p> : <><svg className="knowledge-svg" viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={`${map.nodes.length}개 노드와 ${map.links.length}개 연결로 구성된 프로젝트 맥락 지도`}>{map.links.map((link, index) => { const from = positions.get(link.from); const to = positions.get(link.to); return from && to ? <g key={`${link.from}-${link.to}-${index}`}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} /><text className="link-label" x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 9} textAnchor="middle">{link.relation}</text></g> : null; })}{map.nodes.map((node) => { const position = positions.get(node.id); if (!position) return null; const lines = getLabelLines(node.label); return <g key={node.id} className={tone[node.type]} transform={`translate(${position.x} ${position.y})`}><title>{`${node.label}: ${node.summary}`}</title><circle r="50" /><text className="node-label" textAnchor="middle" y={lines.length > 1 ? -11 : -3}>{lines.map((line, index) => <tspan x="0" dy={index === 0 ? 0 : 15} key={`${line}-${index}`}>{line}</tspan>)}</text><text className="node-type" textAnchor="middle" y="29">{labels[node.type]}</text></g>; })}</svg><ul className="knowledge-details" aria-label="지식맵 노드 상세">{map.nodes.map((node) => <li key={`detail-${node.id}`}><span className={`node-chip ${tone[node.type]}`}>{labels[node.type]}</span><div><strong>{node.label}</strong><p>{node.summary}</p></div></li>)}</ul></>}</section>;
}

function buildLayout(nodes: KnowledgeNode[]) {
  const grouped = new Map<NodeType, KnowledgeNode[]>();
  nodes.forEach((node) => grouped.set(node.type, [...(grouped.get(node.type) ?? []), node]));
  const largest = Math.max(1, ...[...grouped.values()].map((items) => items.length));
  const height = Math.max(MIN_HEIGHT, largest * 132 + PADDING);
  const positions = new Map<string, NodePosition>();
  for (const [type, items] of grouped) items.forEach((node, index) => { const available = height - PADDING * 2; const y = items.length === 1 ? height / 2 : PADDING + available * index / (items.length - 1); positions.set(node.id, { x: lane[type], y }); });
  return { height, positions };
}

function getLabelLines(label: string) {
  const compact = label.replace(/\s+/g, " ").trim();
  if (compact.length <= 8) return [compact];
  const rest = compact.slice(8);
  return [compact.slice(0, 8), rest.length > 8 ? `${rest.slice(0, 7)}…` : rest];
}

export default KnowledgeMap;
