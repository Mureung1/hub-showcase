import type {
  ContextAnalysisResult,
  EvidenceRef,
  KnowledgeNode,
  NodeType,
} from "../types/context";

export type ThoughtKind = "topic" | "perspective" | "decision" | "question" | "term";

export type ThoughtNode = {
  id: string;
  kind: ThoughtKind;
  label: string;
  summary: string;
  evidence: EvidenceRef[];
};

export type ThoughtEdge = {
  id: string;
  from: string;
  to: string;
  relation: string;
};

export type ThoughtGraph = {
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
};

export type ThoughtGraphResult = Omit<ContextAnalysisResult, "provider">;

export type ThoughtPosition = { x: number; y: number };

export const BRAIN_VIEWBOX = { width: 960, height: 600 } as const;

const kindForMapNode: Record<NodeType, ThoughtKind> = {
  topic: "topic",
  person: "perspective",
  role: "perspective",
  decision: "decision",
  question: "question",
};

const clusteredSlots: Record<Exclude<ThoughtKind, "topic">, ThoughtPosition[]> = {
  perspective: [
    { x: 142, y: 128 },
    { x: 314, y: 116 },
    { x: 148, y: 258 },
    { x: 326, y: 252 },
  ],
  term: [
    { x: 146, y: 392 },
    { x: 320, y: 382 },
    { x: 166, y: 512 },
    { x: 334, y: 500 },
  ],
  decision: [
    { x: 640, y: 116 },
    { x: 816, y: 132 },
    { x: 632, y: 250 },
    { x: 814, y: 258 },
  ],
  question: [
    { x: 636, y: 382 },
    { x: 814, y: 394 },
    { x: 648, y: 502 },
    { x: 816, y: 510 },
  ],
};

export function buildThoughtGraph(
  input: ThoughtGraphResult | ContextAnalysisResult["knowledgeMap"],
): ThoughtGraph {
  if (!("knowledgeMap" in input)) return buildFromKnowledgeMap(input);

  const result = input;
  const map = result.knowledgeMap ?? { nodes: [], links: [] };
  const topicNode = map.nodes.find((node) => node.type === "topic");
  const root: ThoughtNode = {
    id: thoughtId("topic", topicNode?.id || result.projectTitle || "project"),
    kind: "topic",
    label: result.projectTitle || topicNode?.label || "프로젝트 맥락",
    summary:
      topicNode?.summary ||
      result.summary?.overview?.[0] ||
      "기록에서 확인한 생각을 한곳에 연결한 중심 주제입니다.",
    evidence: topicNode?.evidence ?? [],
  };

  const participants = (result.participants ?? []).map<ThoughtNode>((item, index) => ({
    id: thoughtId("perspective", item.id || `${item.actor}-${index}`),
    kind: "perspective",
    label: item.actor || `참여자 ${index + 1}`,
    summary: joinSummary([item.role, item.focus, item.concern]),
    evidence: item.evidence ?? [],
  }));
  const decisions = (result.decisions ?? []).map<ThoughtNode>((item, index) => ({
    id: thoughtId("decision", item.id || `${item.decision}-${index}`),
    kind: "decision",
    label: item.decision || `결정 ${index + 1}`,
    summary: joinSummary([statusLabel(item.status), item.reason]),
    evidence: item.evidence ?? [],
  }));
  const questions = (result.questions ?? []).map<ThoughtNode>((item, index) => ({
    id: thoughtId("question", item.id || `${item.question}-${index}`),
    kind: "question",
    label: item.question || `질문 ${index + 1}`,
    summary: joinSummary([item.reason, item.ownerHint ? `확인: ${item.ownerHint}` : ""]),
    evidence: item.evidence ?? [],
  }));
  const terms = (result.keyTerms ?? []).map<ThoughtNode>((item, index) => ({
    id: thoughtId("term", item.id || `${item.term}-${index}`),
    kind: "term",
    label: item.term || `핵심어 ${index + 1}`,
    summary: item.meaning || "분석에서 반복해 확인된 핵심 개념입니다.",
    evidence: item.evidence ?? [],
  }));

  const nodes = [root, ...participants, ...decisions, ...questions, ...terms];
  const mappedIds = mapMapNodes(map.nodes, root, participants, decisions, questions);
  const additionalNodes: ThoughtNode[] = [];

  map.nodes.forEach((node, index) => {
    if (mappedIds.has(node.id)) return;
    const id = thoughtId(kindForMapNode[node.type], `map-${node.id || index}`);
    mappedIds.set(node.id, id);
    additionalNodes.push({
      id,
      kind: kindForMapNode[node.type],
      label: node.label || `연결된 생각 ${index + 1}`,
      summary: node.summary || "분석 지식맵에서 확인된 연결 정보입니다.",
      evidence: node.evidence ?? [],
    });
  });
  nodes.push(...additionalNodes);

  const edges: ThoughtEdge[] = [];
  map.links.forEach((link) => {
    const from = mappedIds.get(link.from);
    const to = mappedIds.get(link.to);
    if (from && to && from !== to) addEdge(edges, from, to, link.relation || "연결");
  });

  for (const node of nodes) {
    if (node.id === root.id) continue;
    if (edges.some((edge) => (
      (edge.from === root.id && edge.to === node.id) ||
      (edge.from === node.id && edge.to === root.id)
    ))) continue;
    addEdge(edges, root.id, node.id, defaultRelation(node.kind));
  }

  return { nodes: uniqueNodes(nodes), edges };
}

export function layoutThoughtNodes(nodes: ThoughtNode[], clustered = true) {
  const positions = new Map<string, ThoughtPosition>();
  const root = nodes.find((node) => node.kind === "topic");
  if (root) positions.set(root.id, { x: BRAIN_VIEWBOX.width / 2, y: BRAIN_VIEWBOX.height / 2 });

  const nonRoot = nodes.filter((node) => node.id !== root?.id);
  if (!clustered) {
    const radiusX = 342;
    const radiusY = 224;
    nonRoot.forEach((node, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(nonRoot.length, 1);
      positions.set(node.id, {
        x: BRAIN_VIEWBOX.width / 2 + Math.cos(angle) * radiusX,
        y: BRAIN_VIEWBOX.height / 2 + Math.sin(angle) * radiusY,
      });
    });
    return positions;
  }

  for (const kind of ["perspective", "term", "decision", "question"] as const) {
    nodes
      .filter((node) => node.kind === kind)
      .forEach((node, index) => {
        const slots = clusteredSlots[kind];
        positions.set(node.id, slots[index % slots.length]);
      });
  }
  return positions;
}

function buildFromKnowledgeMap(map: ContextAnalysisResult["knowledgeMap"]): ThoughtGraph {
  const nodes = map.nodes.map<ThoughtNode>((node, index) => ({
    id: thoughtId(kindForMapNode[node.type], node.id || `${node.label}-${index}`),
    kind: kindForMapNode[node.type],
    label: node.label || `연결된 생각 ${index + 1}`,
    summary: node.summary || "분석 지식맵에서 확인된 연결 정보입니다.",
    evidence: node.evidence ?? [],
  }));
  const idMap = new Map(map.nodes.map((node, index) => [node.id, nodes[index].id]));
  const edges: ThoughtEdge[] = [];
  map.links.forEach((link) => {
    const from = idMap.get(link.from);
    const to = idMap.get(link.to);
    if (from && to && from !== to) addEdge(edges, from, to, link.relation || "연결");
  });
  return { nodes, edges };
}

function mapMapNodes(
  mapNodes: KnowledgeNode[],
  root: ThoughtNode,
  participants: ThoughtNode[],
  decisions: ThoughtNode[],
  questions: ThoughtNode[],
) {
  const result = new Map<string, string>();
  const used = new Set<string>();
  const pools: Partial<Record<NodeType, ThoughtNode[]>> = {
    person: participants,
    role: participants,
    decision: decisions,
    question: questions,
  };

  mapNodes.forEach((node) => {
    if (node.type === "topic") {
      result.set(node.id, root.id);
      return;
    }
    const pool = pools[node.type] ?? [];
    const match = pool.find((candidate) => !used.has(candidate.id) && nodeMatches(node, candidate))
      ?? pool.find((candidate) => !used.has(candidate.id));
    if (match) {
      result.set(node.id, match.id);
      used.add(match.id);
    }
  });
  return result;
}

function nodeMatches(node: KnowledgeNode, candidate: ThoughtNode) {
  const nodeValues = [node.label, node.summary].map(normalize).filter(Boolean);
  const candidateValues = [candidate.label, candidate.summary].map(normalize).filter(Boolean);
  return nodeValues.some((left) => candidateValues.some((right) => (
    left === right || (left.length >= 4 && right.includes(left)) || (right.length >= 4 && left.includes(right))
  )));
}

function thoughtId(kind: ThoughtKind, value: string) {
  const compact = String(value)
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `brain-${kind}-${compact || "unknown"}`;
}

function addEdge(edges: ThoughtEdge[], from: string, to: string, relation: string) {
  const key = `${from}\u0000${to}\u0000${relation}`;
  if (edges.some((edge) => edge.id === key)) return;
  edges.push({ id: key, from, to, relation });
}

function uniqueNodes(nodes: ThoughtNode[]) {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    return true;
  });
}

function normalize(value: string) {
  return String(value || "").toLocaleLowerCase("ko-KR").replace(/[^\p{L}\p{N}]+/gu, "");
}

function joinSummary(values: string[]) {
  return values.map((value) => value?.trim()).filter(Boolean).join(" · ") || "구조화된 생각입니다.";
}

function statusLabel(status: ContextAnalysisResult["decisions"][number]["status"]) {
  return { confirmed: "확정", tentative: "검토 중", unclear: "불명확" }[status];
}

function defaultRelation(kind: ThoughtKind) {
  return {
    topic: "중심 주제",
    perspective: "관점 제공",
    decision: "결정으로 구체화",
    question: "확인 필요",
    term: "핵심 개념",
  }[kind];
}
