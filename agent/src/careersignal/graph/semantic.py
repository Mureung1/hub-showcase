"""의미 층 구축.

만드는 대상은 docs/ontology-v1.md 2장의 D3a 노드 여덟 종과 엣지 여섯 종이다.
생성 주체는 지식 구축 에이전트이며(docs/knowledge-schema.md 7.3) 사후 semantic
묶음은 이 모듈의 범위가 아니다.

이 층은 정규화가 끝난 도메인 관계만 담는다. 원문 표현에서 차원으로 이어지는
정규화는 계보이므로 provenance 층의 `ASSIGNED_TO` 가 담는다.

`Technology` 는 `RequirementDimension` 의 부분집합이다. `dimension_kind` 가
`technology` 인 차원은 `Technology` 노드만 만들어 같은 `ref_id` 가 두 유형으로
나타나지 않게 한다. 노드의 유일 제약이 유형을 키에 포함하므로, 두 유형으로
만들면 제약이 막지 못하는 중복이 생긴다.

엣지는 관계형 테이블에서 빌드한 파생 표현이다. 진실의 원천은 근거 표의 정규
테이블이며 엣지에서 테이블로 향하는 역방향 갱신은 없다(docs/ontology-v1.md 5장).

`weight` 를 채우지 않는다. 그래프는 D3a 에서 구축하고 통계는 D4 에서 계산한다.
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

ONTOLOGY_VERSION = "v1"
"""`0002_seed_reference.sql` 이 시드한 유일한 온톨로지 버전이다."""

TECHNOLOGY_KIND = "technology"
"""`requirement_dimensions.dimension_kind` 가 이 값이면 `Technology` 노드다."""

JOB_ROLE = "JobRole"
POSTING = "Posting"
COMPANY = "Company"
COMPANY_CLUSTER = "CompanyCluster"
REQUIREMENT_DIMENSION = "RequirementDimension"
CAPABILITY = "Capability"
TECHNOLOGY = "Technology"
STANDARD = "Standard"
"""D3a 노드 유형 여덟 종."""

POSTED_BY = "POSTED_BY"
BELONGS_TO_CLUSTER = "BELONGS_TO_CLUSTER"
REQUIRES = "REQUIRES"
REQUIRES_CAPABILITY = "REQUIRES_CAPABILITY"
MAPS_TO_STANDARD = "MAPS_TO_STANDARD"
PREREQUISITE_OF = "PREREQUISITE_OF"
"""D3a 엣지 유형 여섯 종."""

NO_ONTOLOGY = "온톨로지 버전이 등록되어 있지 않다"
NO_JOB_ROLE = "직무 기준 행이 없다"
NO_TAXONOMY_VERSION = "실행 봉투에 분류체계 버전이 없다"
NO_POSTINGS = "데이터셋 버전에 공고가 없다"
NO_MEMBERSHIPS = "기준일에 유효한 기업군 소속이 없다"
NO_DIMENSIONS = "활성 차원이 없다"
NO_CAPABILITIES = "활성 역량이 없다"
NO_STANDARD_MAPPING = "표준에 연결된 활성 차원 버전이 없다"
NO_ASSIGNMENTS = "정규화 할당이 없다"
NO_CAPABILITY_LINKS = "역량과 차원의 연결이 없다"
NO_PREREQUISITE_EVIDENCE = "선수 관계의 Wiki 근거도 표준 근거도 없다"
"""건너뛴 유형의 사유. 원천이 비어 만들 것이 없는 상태와 실패를 구분한다."""


class SemanticSource(Protocol):
    """빌더가 저장소에 요구하는 조회.

    좁게 잡아 대역으로 검증할 수 있게 한다. `SemanticGraphRepository` 가 이 모양을
    만족하며 저장 메서드는 `GraphWriter` 가 따로 선언한다.
    """

    def ontology_rows(self, ontology_version: str) -> list[dict[str, Any]]: ...

    def job_role(self, job_role_id: str) -> dict[str, Any] | None: ...

    def postings(
        self, job_role_id: str, dataset_version: str
    ) -> list[dict[str, Any]]: ...

    def cluster_memberships(
        self, job_role_id: str, as_of_date: Any
    ) -> list[dict[str, Any]]: ...

    def active_dimensions(self, taxonomy_version_id: str) -> list[dict[str, Any]]: ...

    def active_capabilities(self, job_role_id: str) -> list[dict[str, Any]]: ...

    def capability_links(self, taxonomy_version_id: str) -> list[dict[str, Any]]: ...

    def capability_standards(
        self, taxonomy_version_id: str
    ) -> list[dict[str, Any]]: ...

    def assignments(
        self, taxonomy_version_id: str, dataset_version: str, job_role_id: str
    ) -> list[dict[str, Any]]: ...

    def capability_prerequisites(
        self, job_role_id: str, knowledge_version: str | None
    ) -> list[dict[str, Any]]: ...

    def node_ids(self, ontology_version: str, graph_layer: str) -> set[str]: ...

    def edge_ids(self, ontology_version: str, graph_layer: str) -> set[str]: ...

    def add_node(self, values: dict[str, Any]) -> None: ...

    def add_edge(self, values: dict[str, Any]) -> None: ...


def dimension_node_type(dimension_kind: str) -> str:
    """차원 하나가 될 노드 유형.

    기술 차원은 `Technology` 하나로만 만든다. `RequirementDimension` 을 함께
    만들면 같은 차원이 두 노드가 되어 탐색 결과가 중복된다.
    """
    return TECHNOLOGY if dimension_kind == TECHNOLOGY_KIND else REQUIREMENT_DIMENSION


class SemanticGraphBuilder:
    """D3a 의 사전 semantic 묶음을 만든다.

    `lookup` 은 조회가 필요한 두 검사를 켜는 자리다. 구축은 원천 행에서 바로
    후보를 만들므로 근거 실재와 파생 일치가 언제나 참이며, 이미 저장된 엣지의
    재검사는 같은 두 함수로 검증 파이프라인이 수행한다.
    """

    def __init__(
        self, repository: SemanticSource, lookup: OntologyLookup | None = None
    ) -> None:
        self._repository = repository
        self._lookup = lookup

    def run(
        self, context: RunContext, ontology_version: str = ONTOLOGY_VERSION
    ) -> GraphBuildOutcome:
        """원천을 소진할 때까지 노드와 엣지를 만든다.

        원천이 비면 그 유형을 건너뛰고 사실을 결과에 남긴다. 냉시작에서 차원과
        역량이 비어 있는 것이 정상 시작점이므로, 만들 것이 없는 실행과 전제가
        깨진 실행을 구분한다.
        """
        rows = self._repository.ontology_rows(ontology_version)
        if not rows:
            return _halted(context, ontology_version, NO_ONTOLOGY)

        build = LayerBuild(
            ontology=Ontology.from_rows(rows),
            graph_layer=GraphLayer.SEMANTIC,
            ontology_version=ontology_version,
            context=context,
            writer=self._repository,
            lookup=self._lookup,
        )

        role = self._repository.job_role(context.job_role_id)
        if role is None:
            build.fail(context.job_role_id, NO_JOB_ROLE)
            return build.outcome()
        build.node(JOB_ROLE, "job_roles", role["job_role_id"], role["display_name"])

        self._postings(build, context)
        self._clusters(build, context)
        self._dimensions(build, context)
        self._capabilities(build, context)
        self._standards(build, context)
        self._requires(build, context)
        self._requires_capability(build, context)
        self._prerequisites(build, context)
        return build.outcome()

    # ------------------------------------------------------------ 공고와 회사
    def _postings(self, build: LayerBuild, context: RunContext) -> None:
        """`Posting`, `Company` 노드와 `POSTED_BY` 엣지.

        `POSTED_BY` 는 외래키로 성립하므로 근거를 요구하지 않는다.
        """
        rows = self._repository.postings(context.job_role_id, context.dataset_version)
        if not rows:
            build.skip(POSTING, NO_POSTINGS)
            build.skip(COMPANY, NO_POSTINGS)
            build.skip(POSTED_BY, NO_POSTINGS)
            return

        for row in rows:
            company = build.node(
                COMPANY, "companies", row["company_id"], row["company_label"]
            )
            posting = build.node(
                POSTING, "postings", row["posting_id"], row["posting_label"]
            )
            build.edge(POSTED_BY, posting, company)

    def _clusters(self, build: LayerBuild, context: RunContext) -> None:
        """`CompanyCluster` 노드와 `BELONGS_TO_CLUSTER` 엣지.

        엣지의 유효 기간은 membership 의 값을 그대로 옮긴다
        (docs/knowledge-schema.md 7.1.1).
        """
        rows = self._repository.cluster_memberships(
            context.job_role_id, context.as_of_date
        )
        if not rows:
            build.skip(COMPANY_CLUSTER, NO_MEMBERSHIPS)
            build.skip(BELONGS_TO_CLUSTER, NO_MEMBERSHIPS)
            return

        for row in rows:
            company = build.ref(COMPANY, row["company_id"])
            if company is None:
                # 이 데이터셋 버전에 공고가 없는 회사다. 소속만으로 노드를 만들지 않는다.
                continue
            cluster = build.node(
                COMPANY_CLUSTER,
                "company_clusters",
                row["cluster_id"],
                row["cluster_label"],
            )
            build.edge(
                BELONGS_TO_CLUSTER,
                company,
                cluster,
                evidence_id=row["membership_id"],
                valid_from=row["valid_from"],
                valid_to=row["valid_to"],
            )

    # ------------------------------------------------------------ 차원과 역량
    def _dimensions(self, build: LayerBuild, context: RunContext) -> None:
        """`RequirementDimension` 과 `Technology` 노드.

        두 유형만 `taxonomy_version_id` 를 채운다(docs/erd.md 8.2).
        """
        taxonomy_version_id = context.taxonomy_version_id
        if taxonomy_version_id is None:
            build.skip(REQUIREMENT_DIMENSION, NO_TAXONOMY_VERSION)
            build.skip(TECHNOLOGY, NO_TAXONOMY_VERSION)
            return

        rows = self._repository.active_dimensions(taxonomy_version_id)
        if not rows:
            build.skip(REQUIREMENT_DIMENSION, NO_DIMENSIONS)
            build.skip(TECHNOLOGY, NO_DIMENSIONS)
            return

        for row in rows:
            build.node(
                dimension_node_type(row["dimension_kind"]),
                "requirement_dimensions",
                row["dimension_id"],
                row["label"],
                taxonomy_version_id=taxonomy_version_id,
            )

    def _capabilities(self, build: LayerBuild, context: RunContext) -> None:
        """`Capability` 노드. 분류체계에 의존하지 않는다."""
        rows = self._repository.active_capabilities(context.job_role_id)
        if not rows:
            build.skip(CAPABILITY, NO_CAPABILITIES)
            return
        for row in rows:
            build.node(
                CAPABILITY,
                "capabilities",
                row["capability_id"],
                row["canonical_label"],
            )

    def _standards(self, build: LayerBuild, context: RunContext) -> None:
        """`Standard` 노드와 `MAPS_TO_STANDARD` 엣지.

        근거는 차원 버전의 표준 연결 상태다. 한 역량이 여러 차원으로 같은 표준에
        닿으면 엣지는 하나이며 근거는 정렬에서 첫 차원 버전이다.
        """
        taxonomy_version_id = context.taxonomy_version_id
        if taxonomy_version_id is None:
            build.skip(STANDARD, NO_TAXONOMY_VERSION)
            build.skip(MAPS_TO_STANDARD, NO_TAXONOMY_VERSION)
            return

        rows = self._repository.capability_standards(taxonomy_version_id)
        if not rows:
            build.skip(STANDARD, NO_STANDARD_MAPPING)
            build.skip(MAPS_TO_STANDARD, NO_STANDARD_MAPPING)
            return

        for row in rows:
            capability = build.ref(CAPABILITY, row["capability_id"])
            standard = build.node(
                STANDARD, "standards", row["standard_id"], row["standard_label"]
            )
            build.edge(
                MAPS_TO_STANDARD,
                capability,
                standard,
                evidence_id=row["dimension_version_id"],
            )

    # ------------------------------------------------------------ 요구와 역량
    def _requires(self, build: LayerBuild, context: RunContext) -> None:
        """`REQUIRES` 엣지. 근거는 할당이며 분류체계 버전을 채운다."""
        taxonomy_version_id = context.taxonomy_version_id
        if taxonomy_version_id is None:
            build.skip(REQUIRES, NO_TAXONOMY_VERSION)
            return

        rows = self._repository.assignments(
            taxonomy_version_id, context.dataset_version, context.job_role_id
        )
        if not rows:
            build.skip(REQUIRES, NO_ASSIGNMENTS)
            return

        for row in rows:
            posting = build.ref(POSTING, row["posting_id"])
            dimension = self._dimension_ref(build, row["dimension_id"])
            build.edge(
                REQUIRES,
                posting,
                dimension,
                evidence_id=row["assignment_id"],
                taxonomy_version_id=taxonomy_version_id,
            )

    def _requires_capability(self, build: LayerBuild, context: RunContext) -> None:
        """`REQUIRES_CAPABILITY` 엣지. 근거는 역량–차원 연결의 복합키다."""
        taxonomy_version_id = context.taxonomy_version_id
        if taxonomy_version_id is None:
            build.skip(REQUIRES_CAPABILITY, NO_TAXONOMY_VERSION)
            return

        rows = self._repository.capability_links(taxonomy_version_id)
        if not rows:
            build.skip(REQUIRES_CAPABILITY, NO_CAPABILITY_LINKS)
            return

        for row in rows:
            dimension = self._dimension_ref(build, row["dimension_id"])
            capability = build.ref(CAPABILITY, row["capability_id"])
            build.edge(
                REQUIRES_CAPABILITY,
                dimension,
                capability,
                evidence_id=evidence_key(
                    row["capability_id"],
                    row["dimension_id"],
                    row["taxonomy_version_id"],
                ),
                taxonomy_version_id=taxonomy_version_id,
            )

    def _prerequisites(self, build: LayerBuild, context: RunContext) -> None:
        """`PREREQUISITE_OF` 엣지.

        선수 관계는 관측이 아니라 판단이므로 Wiki 근거 또는 공공 표준을 요구한다.
        근거가 없으면 만들지 않는다(docs/ontology-v1.md 4장).
        """
        rows = self._repository.capability_prerequisites(
            context.job_role_id, context.knowledge_version
        )
        if not rows:
            build.skip(PREREQUISITE_OF, NO_PREREQUISITE_EVIDENCE)
            return

        for row in rows:
            build.edge(
                PREREQUISITE_OF,
                build.ref(CAPABILITY, row["src_capability_id"]),
                build.ref(CAPABILITY, row["dst_capability_id"]),
                evidence_id=row.get("evidence_id"),
            )

    @staticmethod
    def _dimension_ref(build: LayerBuild, dimension_id: str) -> NodeRef | None:
        """차원 노드 하나. 기술 차원은 `Technology` 로만 등록되어 있다."""
        return build.ref(TECHNOLOGY, dimension_id) or build.ref(
            REQUIREMENT_DIMENSION, dimension_id
        )


def _halted(
    context: RunContext, ontology_version: str, reason: str
) -> GraphBuildOutcome:
    """구축 전제가 깨진 결과. 만들 것이 없는 상태와 구분한다."""
    return GraphBuildOutcome(
        agent_run_id=context.agent_run_id,
        stop_reason=StopReason.EXPLICIT_FAILURE,
        graph_layer=GraphLayer.SEMANTIC,
        ontology_version=ontology_version,
        taxonomy_version_id=context.taxonomy_version_id,
        errors=((ontology_version, reason),),
    )


__all__ = [
    "BELONGS_TO_CLUSTER",
    "CAPABILITY",
    "COMPANY",
    "COMPANY_CLUSTER",
    "JOB_ROLE",
    "MAPS_TO_STANDARD",
    "NO_ASSIGNMENTS",
    "NO_CAPABILITIES",
    "NO_CAPABILITY_LINKS",
    "NO_DIMENSIONS",
    "NO_JOB_ROLE",
    "NO_MEMBERSHIPS",
    "NO_ONTOLOGY",
    "NO_POSTINGS",
    "NO_PREREQUISITE_EVIDENCE",
    "NO_STANDARD_MAPPING",
    "NO_TAXONOMY_VERSION",
    "ONTOLOGY_VERSION",
    "POSTED_BY",
    "POSTING",
    "PREREQUISITE_OF",
    "REQUIREMENT_DIMENSION",
    "REQUIRES",
    "REQUIRES_CAPABILITY",
    "STANDARD",
    "TECHNOLOGY",
    "TECHNOLOGY_KIND",
    "SemanticGraphBuilder",
    "SemanticSource",
    "dimension_node_type",
]
