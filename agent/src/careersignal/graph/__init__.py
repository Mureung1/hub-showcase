"""온톨로지·그래프 구축·탐색.

정의는 docs/ontology-v1.md 와 docs/knowledge-schema.md 7장을 따른다. 그래프는
semantic 층과 provenance 층 둘이며 `ontology_version` 과 `graph_layer` 가 복합
기본키를 이룬다. 등록되지 않은 유형과 허용되지 않은 연결은 폐기하고 사유를
남긴다.

엣지는 관계형 테이블에서 빌드한 파생 표현이다. 진실의 원천은 근거 표의 정규
테이블이며 엣지에서 테이블로 향하는 역방향 갱신은 없다.

패키지는 유형과 진입점만 내보낸다. 사유 코드와 정책 상수는 모듈에서 직접
import 한다. 같은 이름의 사유 코드가 여러 모듈에 있어 한 이름 공간에 모으면
어느 층의 사유인지 읽히지 않는다.
"""

from careersignal.graph.evidence import (
    OPTIMIZATION_POLICY_V1,
    EvidenceOption,
    EvidenceRejection,
    EvidenceSelection,
    EvidenceSetOutcome,
    OptimizationPolicy,
    evidence_set_identifier,
    optimization_policy_for,
    optimize,
)
from careersignal.graph.identifiers import edge_identifier, node_identifier
from careersignal.graph.ontology import (
    EdgeCandidate,
    GraphBuildOutcome,
    GraphLayer,
    GraphWriter,
    LayerBuild,
    NodeCandidate,
    NodeRef,
    Ontology,
    OntologyLayer,
    OntologyLookup,
    Violation,
    check_derivation,
    check_evidence_exists,
    discard_record,
    evidence_key,
    evidence_parts,
)
from careersignal.graph.paths import (
    CacheKey,
    GraphPathRunner,
    PathCacheOutcome,
    PathSource,
    path_identifier,
)
from careersignal.graph.policy import (
    GRAPH_POLICY_V1,
    PathSpec,
    PathStep,
    TraversalPolicy,
    policy_for,
)
from careersignal.graph.provenance import LineageSource, ProvenanceGraphBuilder
from careersignal.graph.semantic import (
    ONTOLOGY_VERSION,
    SemanticGraphBuilder,
    SemanticSource,
    dimension_node_type,
)
from careersignal.graph.traversal import (
    GraphEdge,
    GraphNode,
    GraphPath,
    GraphView,
    TraversalCut,
    TraversalOutcome,
    layer_transition_allowed,
    order_paths,
    path_sort_key,
    traverse,
    validate_spec,
)

__all__ = [
    "GRAPH_POLICY_V1",
    "ONTOLOGY_VERSION",
    "OPTIMIZATION_POLICY_V1",
    "CacheKey",
    "EdgeCandidate",
    "EvidenceOption",
    "EvidenceRejection",
    "EvidenceSelection",
    "EvidenceSetOutcome",
    "GraphBuildOutcome",
    "GraphEdge",
    "GraphLayer",
    "GraphNode",
    "GraphPath",
    "GraphPathRunner",
    "GraphView",
    "GraphWriter",
    "LayerBuild",
    "LineageSource",
    "NodeCandidate",
    "NodeRef",
    "Ontology",
    "OntologyLayer",
    "OntologyLookup",
    "OptimizationPolicy",
    "PathCacheOutcome",
    "PathSource",
    "PathSpec",
    "PathStep",
    "ProvenanceGraphBuilder",
    "SemanticGraphBuilder",
    "SemanticSource",
    "TraversalCut",
    "TraversalOutcome",
    "TraversalPolicy",
    "Violation",
    "check_derivation",
    "check_evidence_exists",
    "dimension_node_type",
    "discard_record",
    "edge_identifier",
    "evidence_key",
    "evidence_parts",
    "evidence_set_identifier",
    "layer_transition_allowed",
    "node_identifier",
    "optimization_policy_for",
    "optimize",
    "order_paths",
    "path_identifier",
    "path_sort_key",
    "policy_for",
    "traverse",
    "validate_spec",
]
