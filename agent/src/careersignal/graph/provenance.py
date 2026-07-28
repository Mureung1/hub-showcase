"""계보 층 구축.

만드는 대상은 docs/ontology-v1.md 3장의 노드 열 종과 엣지 아홉 종 전부다.
생성 주체는 계보 기록 파이프라인이며, 각 계층의 산출물이 정규 테이블에 저장된
직후 실행한다(docs/adr/0008-lineage-write-path.md).

이 층의 엣지는 정규 테이블의 외래키를 그래프 표현으로 옮긴 것이다. 판단이
개입하지 않으므로 같은 입력에 같은 엣지를 낸다. 정규 테이블과 엣지가 어긋나면
엣지를 폐기하고 다시 기록한다.

`ASSIGNED_TO` 만 semantic 노드를 도착점으로 갖는다. 원문 표현에서 정규화된
차원으로 이어지는 계보이므로 두 층을 잇는다. 도착점 노드는 지식 구축 에이전트가
만들며 이 모듈은 만들지 않고 찾아 쓴다. 노드가 아직 없으면 그 엣지를 만들지 않고
폐기 사유를 남긴다.

원천이 비어 있는 유형은 건너뛰고 그 사실을 결과에 남긴다. D4 와 D5 의 산출물은
뒤 Phase 에서 채워지므로, 지금은 `SourceSnapshot`, `Chunk`, `RequirementMention`,
`AgentRun` 만 원천을 갖는다.
"""

from __future__ import annotations

from typing import Any, Protocol

from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.graph.ontology import (
    GraphBuildOutcome,
    GraphLayer,
    LayerBuild,
    NodeRef,
    Ontology,
    OntologyLookup,
    evidence_key,
)
from careersignal.graph.semantic import (
    ONTOLOGY_VERSION,
    REQUIREMENT_DIMENSION,
    TECHNOLOGY,
    dimension_node_type,
)

SOURCE_SNAPSHOT = "SourceSnapshot"
CHUNK = "Chunk"
REQUIREMENT_MENTION = "RequirementMention"
ASSIGNMENT = "Assignment"
STATISTIC_FACT = "StatisticFact"
ANALYSIS_CLAIM = "AnalysisClaim"
CHECKLIST_ITEM = "ChecklistItem"
ROADMAP_ITEM = "RoadmapItem"
ANALYSIS_OUTPUT = "AnalysisOutput"
AGENT_RUN = "AgentRun"
"""계보 층 노드 유형 열 종."""

PART_OF = "PART_OF"
EVIDENCED_BY = "EVIDENCED_BY"
ASSIGNED_TO = "ASSIGNED_TO"
COMPUTED_FROM = "COMPUTED_FROM"
SUPPORTED_BY = "SUPPORTED_BY"
CONTRADICTED_BY = "CONTRADICTED_BY"
DERIVED_FROM = "DERIVED_FROM"
FILLS = "FILLS"
PRODUCED_BY = "PRODUCED_BY"
"""계보 층 엣지 유형 아홉 종."""

SUPPORT_CHUNK = "chunk"
SUPPORT_FACT = "statistic_fact"
RELATION_SUPPORTS = "supports"
"""`analysis_claim_evidence` 의 값. 지지와 반박이 두 엣지로 갈린다."""

NO_ONTOLOGY = "온톨로지 버전이 등록되어 있지 않다"
NO_TAXONOMY_VERSION = "실행 봉투에 분류체계 버전이 없다"
NO_SNAPSHOTS = "데이터셋 버전에 스냅샷이 없다"
NO_CHUNKS = "데이터셋 버전에 청크가 없다"
NO_MENTIONS = "데이터셋 버전에 요구 표현이 없다"
NO_ASSIGNMENTS = "정규화 할당이 없다"
NO_FACTS = "분석 버전에 지표 사실이 없다"
NO_CLAIMS = "분석 버전에 주장이 없다"
NO_CLAIM_EVIDENCE = "주장과 근거의 연결이 없다"
NO_CHECKLIST_ITEMS = "분석 버전에 체크리스트 항목이 없다"
NO_ROADMAP_ITEMS = "분석 버전에 로드맵 항목이 없다"
NO_ROADMAP_FILLS = "로드맵 항목과 체크리스트 항목의 충족 연결이 없다"
NO_OUTPUTS = "분석 버전에 산출물이 없다"
NO_RUNS = "분석 버전에 실행 기록이 없다"
NO_FACT_INPUTS = "지표 사실과 할당을 잇는 원천이 없다"
NO_ITEM_CLAIMS = "체크리스트 항목과 주장을 잇는 원천이 없다"
"""건너뛴 유형의 사유."""


class LineageSource(Protocol):
    """빌더가 저장소에 요구하는 조회.

    `LineageGraphRepository` 가 이 모양을 만족한다.
    """

    def ontology_rows(self, ontology_version: str) -> list[dict[str, Any]]: ...

    def semantic_nodes(self, ontology_version: str) -> list[dict[str, Any]]: ...

    def snapshots(self, dataset_version: str) -> list[dict[str, Any]]: ...

    def chunks(self, dataset_version: str) -> list[dict[str, Any]]: ...

    def mentions(self, dataset_version: str) -> list[dict[str, Any]]: ...

    def assignments(
        self, taxonomy_version_id: str, dataset_version: str
    ) -> list[dict[str, Any]]: ...

    def statistic_facts(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def analysis_claims(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def claim_evidence(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def checklist_items(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def roadmap_items(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def roadmap_fills(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def analysis_outputs(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def agent_runs(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def output_runs(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def fact_inputs(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def item_claims(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def node_ids(self, ontology_version: str, graph_layer: str) -> set[str]: ...

    def edge_ids(self, ontology_version: str, graph_layer: str) -> set[str]: ...

    def add_node(self, values: dict[str, Any]) -> None: ...

    def add_edge(self, values: dict[str, Any]) -> None: ...


class ProvenanceGraphBuilder:
    """계보 층 전체를 만든다.

    `lookup` 은 조회가 필요한 두 검사를 켜는 자리이며 의미는 의미 층 빌더와 같다.
    """

    def __init__(
        self, repository: LineageSource, lookup: OntologyLookup | None = None
    ) -> None:
        self._repository = repository
        self._lookup = lookup

    def run(
        self, context: RunContext, ontology_version: str = ONTOLOGY_VERSION
    ) -> GraphBuildOutcome:
        """원천이 있는 유형을 만들고 나머지는 건너뛴다."""
        rows = self._repository.ontology_rows(ontology_version)
        if not rows:
            return _halted(context, ontology_version, NO_ONTOLOGY)

        build = LayerBuild(
            ontology=Ontology.from_rows(rows),
            graph_layer=GraphLayer.PROVENANCE,
            ontology_version=ontology_version,
            context=context,
            writer=self._repository,
            lookup=self._lookup,
        )
        self._adopt_semantic(build, ontology_version)

        self._snapshots(build, context)
        self._chunks(build, context)
        self._mentions(build, context)
        self._assignments(build, context)
        self._facts(build, context)
        self._claims(build, context)
        self._checklist(build, context)
        self._roadmap(build, context)
        self._outputs(build, context)
        return build.outcome()

    # ------------------------------------------------------------ 층 사이 연결
    def _adopt_semantic(self, build: LayerBuild, ontology_version: str) -> None:
        """`ASSIGNED_TO` 의 도착점이 될 semantic 노드를 등록한다.

        차원과 기술 노드만 쓴다. 다른 유형을 도착점으로 쓰면 층 경계 검사가
        폐기한다.
        """
        for row in self._repository.semantic_nodes(ontology_version):
            if row["node_type"] not in (REQUIREMENT_DIMENSION, TECHNOLOGY):
                continue
            build.adopt(
                NodeRef(
                    node_id=row["node_id"],
                    graph_layer=GraphLayer.SEMANTIC,
                    node_type=row["node_type"],
                    ref_id=row["ref_id"],
                )
            )

    # ------------------------------------------------------------ D0~D2
    def _snapshots(self, build: LayerBuild, context: RunContext) -> None:
        """`SourceSnapshot` 노드."""
        rows = self._repository.snapshots(context.dataset_version)
        if not rows:
            build.skip(SOURCE_SNAPSHOT, NO_SNAPSHOTS)
            return
        for row in rows:
            build.node(
                SOURCE_SNAPSHOT, "source_snapshots", row["snapshot_id"], row["label"]
            )

    def _chunks(self, build: LayerBuild, context: RunContext) -> None:
        """`Chunk` 노드와 `PART_OF` 엣지. 외래키로 성립하므로 근거가 없다."""
        rows = self._repository.chunks(context.dataset_version)
        if not rows:
            build.skip(CHUNK, NO_CHUNKS)
            build.skip(PART_OF, NO_CHUNKS)
            return
        for row in rows:
            chunk = build.node(
                CHUNK,
                "source_chunks",
                row["chunk_id"],
                f"{row['section']}#{row['ordinal']}",
            )
            build.edge(
                PART_OF, chunk, build.ref(SOURCE_SNAPSHOT, row["snapshot_id"])
            )

    def _mentions(self, build: LayerBuild, context: RunContext) -> None:
        """`RequirementMention` 노드와 `EVIDENCED_BY` 엣지."""
        rows = self._repository.mentions(context.dataset_version)
        if not rows:
            build.skip(REQUIREMENT_MENTION, NO_MENTIONS)
            build.skip(EVIDENCED_BY, NO_MENTIONS)
            return
        for row in rows:
            mention = build.node(
                REQUIREMENT_MENTION,
                "requirement_mentions",
                row["mention_id"],
                row["raw_expression"],
            )
            build.edge(
                EVIDENCED_BY,
                mention,
                build.ref(CHUNK, row["chunk_id"]),
                evidence_id=row["mention_id"],
            )

    def _assignments(self, build: LayerBuild, context: RunContext) -> None:
        """`Assignment` 노드와 `ASSIGNED_TO` 엣지.

        도착점은 semantic 층의 차원 노드다. 층 경계 검사가 이 예외 하나만
        허용한다.
        """
        taxonomy_version_id = context.taxonomy_version_id
        if taxonomy_version_id is None:
            build.skip(ASSIGNMENT, NO_TAXONOMY_VERSION)
            build.skip(ASSIGNED_TO, NO_TAXONOMY_VERSION)
            return

        rows = self._repository.assignments(
            taxonomy_version_id, context.dataset_version
        )
        if not rows:
            build.skip(ASSIGNMENT, NO_ASSIGNMENTS)
            build.skip(ASSIGNED_TO, NO_ASSIGNMENTS)
            return

        for row in rows:
            build.node(
                ASSIGNMENT,
                "posting_requirement_assignments",
                row["assignment_id"],
                row["normalized_label"],
            )
            build.edge(
                ASSIGNED_TO,
                build.ref(REQUIREMENT_MENTION, row["mention_id"]),
                build.ref(
                    dimension_node_type(row["dimension_kind"]), row["dimension_id"]
                ),
                evidence_id=row["assignment_id"],
                taxonomy_version_id=taxonomy_version_id,
            )

    # ------------------------------------------------------------ D4
    def _facts(self, build: LayerBuild, context: RunContext) -> None:
        """`StatisticFact` 노드와 `COMPUTED_FROM` 엣지."""
        rows = self._repository.statistic_facts(context.analysis_version)
        if not rows:
            build.skip(STATISTIC_FACT, NO_FACTS)
            build.skip(COMPUTED_FROM, NO_FACTS)
            return
        for row in rows:
            build.node(
                STATISTIC_FACT,
                "statistics_facts",
                row["fact_id"],
                f"{row['metric_family']}:{row['measure']}",
            )

        inputs = self._repository.fact_inputs(context.analysis_version)
        if not inputs:
            build.skip(COMPUTED_FROM, NO_FACT_INPUTS)
            return
        for row in inputs:
            build.edge(
                COMPUTED_FROM,
                build.ref(STATISTIC_FACT, row["fact_id"]),
                build.ref(ASSIGNMENT, row["assignment_id"]),
                evidence_id=row["fact_id"],
            )

    # ------------------------------------------------------------ D5
    def _claims(self, build: LayerBuild, context: RunContext) -> None:
        """`AnalysisClaim` 노드와 `SUPPORTED_BY`·`CONTRADICTED_BY` 엣지."""
        rows = self._repository.analysis_claims(context.analysis_version)
        if not rows:
            build.skip(ANALYSIS_CLAIM, NO_CLAIMS)
            build.skip(SUPPORTED_BY, NO_CLAIMS)
            build.skip(CONTRADICTED_BY, NO_CLAIMS)
            return
        for row in rows:
            build.node(
                ANALYSIS_CLAIM, "analysis_claims", row["claim_id"], row["claim_text"]
            )

        evidence = self._repository.claim_evidence(context.analysis_version)
        if not evidence:
            build.skip(SUPPORTED_BY, NO_CLAIM_EVIDENCE)
            build.skip(CONTRADICTED_BY, NO_CLAIM_EVIDENCE)
            return
        for row in evidence:
            supports = row["relation"] == RELATION_SUPPORTS
            target = (
                CHUNK if row["support_type"] == SUPPORT_CHUNK else STATISTIC_FACT
            )
            build.edge(
                SUPPORTED_BY if supports else CONTRADICTED_BY,
                build.ref(ANALYSIS_CLAIM, row["claim_id"]),
                build.ref(target, row["support_id"]),
                evidence_id=evidence_key(
                    row["claim_id"],
                    row["support_type"],
                    row["support_id"],
                    row["relation"],
                ),
            )

    def _checklist(self, build: LayerBuild, context: RunContext) -> None:
        """`ChecklistItem` 노드와 `DERIVED_FROM` 엣지."""
        rows = self._repository.checklist_items(context.analysis_version)
        if not rows:
            build.skip(CHECKLIST_ITEM, NO_CHECKLIST_ITEMS)
            build.skip(DERIVED_FROM, NO_CHECKLIST_ITEMS)
            return
        for row in rows:
            build.node(
                CHECKLIST_ITEM, "checklist_items", row["item_id"], row["title"]
            )

        links = self._repository.item_claims(context.analysis_version)
        if not links:
            build.skip(DERIVED_FROM, NO_ITEM_CLAIMS)
            return
        for row in links:
            build.edge(
                DERIVED_FROM,
                build.ref(CHECKLIST_ITEM, row["item_id"]),
                build.ref(ANALYSIS_CLAIM, row["claim_id"]),
                evidence_id=row["item_id"],
            )

    def _roadmap(self, build: LayerBuild, context: RunContext) -> None:
        """`RoadmapItem` 노드와 `FILLS` 엣지."""
        rows = self._repository.roadmap_items(context.analysis_version)
        if not rows:
            build.skip(ROADMAP_ITEM, NO_ROADMAP_ITEMS)
            build.skip(FILLS, NO_ROADMAP_ITEMS)
            return
        for row in rows:
            build.node(
                ROADMAP_ITEM, "roadmap_items", row["roadmap_item_id"], row["title"]
            )

        fills = self._repository.roadmap_fills(context.analysis_version)
        if not fills:
            build.skip(FILLS, NO_ROADMAP_FILLS)
            return
        for row in fills:
            build.edge(
                FILLS,
                build.ref(ROADMAP_ITEM, row["roadmap_item_id"]),
                build.ref(CHECKLIST_ITEM, row["item_id"]),
                evidence_id=evidence_key(row["roadmap_item_id"], row["concept_id"]),
            )

    def _outputs(self, build: LayerBuild, context: RunContext) -> None:
        """`AnalysisOutput`·`AgentRun` 노드와 `PRODUCED_BY` 엣지."""
        runs = self._repository.agent_runs(context.analysis_version)
        if not runs:
            build.skip(AGENT_RUN, NO_RUNS)
        for row in runs:
            build.node(
                AGENT_RUN,
                "agent_runs",
                row["agent_run_id"],
                f"{row['agent_name']}#{row['iteration']}",
            )

        rows = self._repository.analysis_outputs(context.analysis_version)
        if not rows:
            build.skip(ANALYSIS_OUTPUT, NO_OUTPUTS)
            build.skip(PRODUCED_BY, NO_OUTPUTS)
            return
        for row in rows:
            build.node(
                ANALYSIS_OUTPUT,
                "analysis_outputs",
                row["output_id"],
                f"{row['output_type']}:{row['scope_level']}:{row['scope_id']}",
            )

        for row in self._repository.output_runs(context.analysis_version):
            build.edge(
                PRODUCED_BY,
                build.ref(ANALYSIS_OUTPUT, row["output_id"]),
                build.ref(AGENT_RUN, row["agent_run_id"]),
                evidence_id=row["agent_run_id"],
            )


def _halted(
    context: RunContext, ontology_version: str, reason: str
) -> GraphBuildOutcome:
    """구축 전제가 깨진 결과."""
    return GraphBuildOutcome(
        agent_run_id=context.agent_run_id,
        stop_reason=StopReason.EXPLICIT_FAILURE,
        graph_layer=GraphLayer.PROVENANCE,
        ontology_version=ontology_version,
        taxonomy_version_id=context.taxonomy_version_id,
        errors=((ontology_version, reason),),
    )


__all__ = [
    "AGENT_RUN",
    "ANALYSIS_CLAIM",
    "ANALYSIS_OUTPUT",
    "ASSIGNED_TO",
    "ASSIGNMENT",
    "CHECKLIST_ITEM",
    "CHUNK",
    "COMPUTED_FROM",
    "CONTRADICTED_BY",
    "DERIVED_FROM",
    "EVIDENCED_BY",
    "FILLS",
    "NO_ASSIGNMENTS",
    "NO_CHECKLIST_ITEMS",
    "NO_CHUNKS",
    "NO_CLAIMS",
    "NO_CLAIM_EVIDENCE",
    "NO_FACTS",
    "NO_FACT_INPUTS",
    "NO_ITEM_CLAIMS",
    "NO_MENTIONS",
    "NO_ONTOLOGY",
    "NO_OUTPUTS",
    "NO_ROADMAP_FILLS",
    "NO_ROADMAP_ITEMS",
    "NO_RUNS",
    "NO_SNAPSHOTS",
    "NO_TAXONOMY_VERSION",
    "PART_OF",
    "PRODUCED_BY",
    "REQUIREMENT_MENTION",
    "ROADMAP_ITEM",
    "SOURCE_SNAPSHOT",
    "STATISTIC_FACT",
    "SUPPORTED_BY",
    "LineageSource",
    "ProvenanceGraphBuilder",
]
