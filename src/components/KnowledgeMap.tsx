import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { ContextAnalysisResult, EvidenceRef } from "../types/context";
import {
  BRAIN_VIEWBOX,
  buildThoughtGraph,
  layoutThoughtNodes,
  type ThoughtEdge,
  type ThoughtGraphResult,
  type ThoughtKind,
  type ThoughtNode,
} from "../utils/thoughtGraph";

type KnowledgeMapProps = {
  map?: ContextAnalysisResult["knowledgeMap"];
  result?: ThoughtGraphResult;
  onOpenEvidence?: (evidence: EvidenceRef[]) => void;
};

type ThoughtFilter = "all" | Exclude<ThoughtKind, "topic">;

const filters: { id: ThoughtFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "perspective", label: "관점" },
  { id: "decision", label: "결정" },
  { id: "question", label: "질문" },
  { id: "term", label: "핵심어" },
];

const kindLabels: Record<ThoughtKind, string> = {
  topic: "중심 주제",
  perspective: "관점",
  decision: "결정",
  question: "질문",
  term: "핵심어",
};

function KnowledgeMap({ map, result, onOpenEvidence }: KnowledgeMapProps) {
  const headingId = useId();
  const graphTitleId = useId();
  const graphDescriptionId = useId();
  const inspectorId = useId();
  const outlineId = useId();
  const graph = useMemo(
    () => buildThoughtGraph(result ?? map ?? { nodes: [], links: [] }),
    [map, result],
  );
  const [activeFilter, setActiveFilter] = useState<ThoughtFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(graph.nodes[0]?.id ?? "");
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());

  const matchingNodes = useMemo(
    () => filterThoughts(graph.nodes, activeFilter, query),
    [activeFilter, graph.nodes, query],
  );
  const visualNodes = useMemo(
    () => chooseVisualNodes(matchingNodes, activeFilter, Boolean(query.trim())),
    [activeFilter, matchingNodes, query],
  );
  const visualIds = new Set(visualNodes.map((node) => node.id));
  const visualEdges = graph.edges.filter((edge) => visualIds.has(edge.from) && visualIds.has(edge.to));
  const selectedNode = matchingNodes.find((node) => node.id === selectedId)
    ?? matchingNodes.find((node) => node.kind === "topic")
    ?? matchingNodes[0];
  const effectiveSelectedId = selectedNode?.id ?? "";
  const selectedEdges = selectedNode
    ? graph.edges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id)
    : [];
  const connectedIds = new Set([
    effectiveSelectedId,
    ...selectedEdges.flatMap((edge) => [edge.from, edge.to]),
  ]);
  const positions = layoutThoughtNodes(visualNodes, activeFilter === "all" && !query.trim());
  const thoughtCount = graph.nodes.length;
  const hiddenVisualCount = Math.max(0, matchingNodes.length - visualNodes.length);

  const selectNode = (id: string) => setSelectedId(id);
  const handleNodeKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const index = visualNodes.findIndex((node) => node.id === id);
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % visualNodes.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + visualNodes.length) % visualNodes.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = visualNodes.length - 1;
    else return;
    event.preventDefault();
    nodeRefs.current.get(visualNodes[next]?.id)?.focus();
  };

  return (
    <section className="result-panel map-panel brain-panel" aria-labelledby={headingId}>
      <div className="panel-heading brain-heading">
        <div>
          <p className="section-kicker">Brain canvas</p>
          <h2 id={headingId}>공유 지식맵</h2>
          <p className="brain-heading-copy">
            흩어진 기록을 생각 단위로 나누고, 선택한 생각과 바로 이어진 맥락을 따라가 보세요.
          </p>
        </div>
        <div className="brain-stat" aria-label={`${thoughtCount}개 생각, ${graph.edges.length}개 연결`}>
          <strong>{thoughtCount}</strong>
          <span>개의 생각</span>
          <i aria-hidden="true" />
          <strong>{graph.edges.length}</strong>
          <span>개의 연결</span>
        </div>
      </div>

      {graph.nodes.length === 0 ? (
        <p className="knowledge-empty">분석 결과에서 표시할 생각을 찾지 못했습니다.</p>
      ) : (
        <div className="brain-shell" data-testid="brain-canvas">
          <div className="brain-toolbar" aria-label="브레인 캔버스 탐색 도구">
            <label className="brain-search">
              <span>생각 검색</span>
              <input
                type="search"
                value={query}
                placeholder="이름이나 내용으로 찾기"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="brain-filters" role="group" aria-label="생각 유형 필터">
              {filters.map((filter) => {
                const count = filter.id === "all"
                  ? graph.nodes.length
                  : graph.nodes.filter((node) => node.kind === filter.id).length;
                return (
                  <button
                    key={filter.id}
                    className={activeFilter === filter.id ? "active" : ""}
                    type="button"
                    aria-pressed={activeFilter === filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                  >
                    {filter.label} <span>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="brain-result-status" role="status">
            {matchingNodes.length === 0
              ? "검색 조건과 일치하는 생각이 없습니다."
              : hiddenVisualCount > 0
                ? `${matchingNodes.length}개 중 ${visualNodes.length}개를 캔버스에 표시합니다. 아래 생각 목록에서는 모두 확인할 수 있습니다.`
                : `${matchingNodes.length}개 생각을 표시합니다.`}
          </p>

          <div className="brain-content">
            <div className="brain-stage-wrap">
              {visualNodes.length > 0 ? (
                <div className="brain-stage" data-testid="brain-stage">
                  <svg
                    className="brain-connections"
                    viewBox={`0 0 ${BRAIN_VIEWBOX.width} ${BRAIN_VIEWBOX.height}`}
                    role="img"
                    aria-labelledby={`${graphTitleId} ${graphDescriptionId}`}
                  >
                    <title id={graphTitleId}>프로젝트 맥락 지도</title>
                    <desc id={graphDescriptionId}>
                      {`${visualNodes.length}개 노드와 ${visualEdges.length}개 연결로 구성된 프로젝트 맥락 지도입니다. 연결 관계는 아래 생각 목록에서도 확인할 수 있습니다.`}
                    </desc>
                    {visualEdges.map((edge) => {
                      const from = positions.get(edge.from);
                      const to = positions.get(edge.to);
                      if (!from || !to) return null;
                      const active = edge.from === effectiveSelectedId || edge.to === effectiveSelectedId;
                      return (
                        <g key={edge.id} className={active ? "is-active" : connectedIds.size > 1 ? "is-muted" : ""}>
                          <path d={connectionPath(from, to)} />
                          {active && (
                            <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} textAnchor="middle">
                              {edge.relation}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                  <div className="brain-hemisphere left" aria-hidden="true" />
                  <div className="brain-hemisphere right" aria-hidden="true" />
                  <div className="brain-node-layer">
                    {visualNodes.map((node) => {
                      const position = positions.get(node.id);
                      if (!position) return null;
                      const selected = node.id === effectiveSelectedId;
                      const muted = !selected && connectedIds.size > 1 && !connectedIds.has(node.id);
                      return (
                        <button
                          key={node.id}
                          ref={(element) => {
                            if (element) nodeRefs.current.set(node.id, element);
                            else nodeRefs.current.delete(node.id);
                          }}
                          className={`brain-node brain-kind-${node.kind}${selected ? " is-selected" : ""}${muted ? " is-muted" : ""}`}
                          style={{
                            left: `${(position.x / BRAIN_VIEWBOX.width) * 100}%`,
                            top: `${(position.y / BRAIN_VIEWBOX.height) * 100}%`,
                          }}
                          type="button"
                          aria-label={`${kindLabels[node.kind]} 생각: ${node.label}`}
                          aria-pressed={selected}
                          aria-controls={inspectorId}
                          data-testid={`brain-node-${node.id}`}
                          onClick={() => selectNode(node.id)}
                          onKeyDown={(event) => handleNodeKeyDown(event, node.id)}
                        >
                          <span>{kindLabels[node.kind]}</span>
                          <strong>{clipLabel(node.label)}</strong>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="brain-no-results">필터나 검색어를 바꿔 다른 생각을 찾아보세요.</div>
              )}
            </div>

            <BrainInspector
              id={inspectorId}
              node={selectedNode}
              edges={selectedEdges}
              nodes={graph.nodes}
              onSelect={selectNode}
              onOpenEvidence={onOpenEvidence}
            />

            <section className="brain-outline" aria-labelledby={outlineId}>
              <div className="brain-outline-heading">
                <div>
                  <p>Accessible thought outline</p>
                  <h3 id={outlineId}>생각과 연결 전체 보기</h3>
                </div>
                <span>{matchingNodes.length}개</span>
              </div>
              {matchingNodes.length === 0 ? (
                <p className="brain-outline-empty">일치하는 생각이 없습니다.</p>
              ) : (
                <ul aria-label="생각과 연결 관계 목록">
                  {matchingNodes.map((node) => {
                    const relationships = graph.edges.filter((edge) => edge.from === node.id || edge.to === node.id);
                    return (
                      <li key={`outline-${node.id}`} className={`brain-kind-${node.kind}`}>
                        <button
                          type="button"
                          aria-pressed={node.id === effectiveSelectedId}
                          aria-controls={inspectorId}
                          onClick={() => selectNode(node.id)}
                        >
                          <span>{kindLabels[node.kind]}</span>
                          <strong>{node.label}</strong>
                        </button>
                        <p>{node.summary}</p>
                        <small>{relationshipSummary(node, relationships, graph.nodes)}</small>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  );
}

function BrainInspector({
  id,
  node,
  edges,
  nodes,
  onSelect,
  onOpenEvidence,
}: {
  id: string;
  node?: ThoughtNode;
  edges: ThoughtEdge[];
  nodes: ThoughtNode[];
  onSelect: (id: string) => void;
  onOpenEvidence?: (evidence: EvidenceRef[]) => void;
}) {
  return (
    <aside className="brain-inspector" id={id} aria-live="polite" aria-label="선택한 생각 상세">
      {node ? (
        <>
          <div className={`brain-inspector-type brain-kind-${node.kind}`}>{kindLabels[node.kind]}</div>
          <h3>{node.label}</h3>
          <p>{node.summary}</p>
          <div className="brain-related">
            <strong>직접 연결된 생각 {edges.length}개</strong>
            {edges.length > 0 ? (
              <ul>
                {edges.slice(0, 8).map((edge) => {
                  const relatedId = edge.from === node.id ? edge.to : edge.from;
                  const related = nodes.find((item) => item.id === relatedId);
                  if (!related) return null;
                  return (
                    <li key={`${node.id}-${edge.id}`}>
                      <button type="button" onClick={() => onSelect(related.id)}>
                        <span>{edge.relation}</span>
                        <strong>{related.label}</strong>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : <p>아직 직접 연결된 생각이 없습니다.</p>}
          </div>
          {onOpenEvidence && node.evidence.length > 0 && (
            <button className="brain-evidence-button" type="button" onClick={() => onOpenEvidence(node.evidence)}>
              근거 {node.evidence.length}개 열기
            </button>
          )}
        </>
      ) : <p>생각을 선택하면 내용과 연결 관계가 여기에 표시됩니다.</p>}
    </aside>
  );
}

function filterThoughts(nodes: ThoughtNode[], filter: ThoughtFilter, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const allowed = nodes.filter((node) => filter === "all" || node.kind === filter || node.kind === "topic");
  if (!normalizedQuery) return allowed;

  const matches = allowed.filter((node) => (
    `${node.label} ${node.summary}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery)
  ));
  const topic = allowed.find((node) => node.kind === "topic");
  if (!topic || matches.some((node) => node.id === topic.id) || matches.length === 0) return matches;
  return [topic, ...matches];
}

function chooseVisualNodes(nodes: ThoughtNode[], filter: ThoughtFilter, searching: boolean) {
  const topic = nodes.find((node) => node.kind === "topic");
  const nonRoot = nodes.filter((node) => node.kind !== "topic");
  if (filter !== "all" || searching) return [...(topic ? [topic] : []), ...nonRoot.slice(0, 10)];
  return [
    ...(topic ? [topic] : []),
    ...(["perspective", "term", "decision", "question"] as const)
      .flatMap((kind) => nonRoot.filter((node) => node.kind === kind).slice(0, 4)),
  ];
}

function connectionPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const midpoint = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${midpoint} ${from.y}, ${midpoint} ${to.y}, ${to.x} ${to.y}`;
}

function clipLabel(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 18 ? `${compact.slice(0, 17)}…` : compact;
}

function relationshipSummary(node: ThoughtNode, edges: ThoughtEdge[], nodes: ThoughtNode[]) {
  if (edges.length === 0) return "직접 연결 없음";
  return edges.slice(0, 3).map((edge) => {
    const relatedId = edge.from === node.id ? edge.to : edge.from;
    const related = nodes.find((item) => item.id === relatedId);
    return `${edge.relation} · ${related?.label ?? "연결된 생각"}`;
  }).join(" / ");
}

export default KnowledgeMap;
