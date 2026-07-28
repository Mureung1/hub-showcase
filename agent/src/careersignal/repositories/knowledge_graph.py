"""의미 층 그래프 저장소.

지식 구축 에이전트가 사용한다. 쓰기 범위는 docs/permission-matrix.md 3장의
`knowledge_nodes`·`knowledge_edges` 사전 semantic 묶음이며, 컬럼은 docs/erd.md
8.2·8.3이다.

`knowledge_nodes` 와 `knowledge_edges` 는 지식 구축 에이전트와 계보 기록
파이프라인이 함께 쓰므로 테이블 단위 GRANT 로 나누지 못한다. 행 수준 정책이
층과 유형으로 범위를 나누고(`0005_graph_policies.sql`), 저장소를 둘로 나눠 각
구성요소가 자기 범위의 메서드만 갖게 한다. 근거는
docs/adr/0008-lineage-write-path.md 다.

조회는 쓰기보다 넓다. 지식 구축은 D0~D4 전체를 읽는다
(docs/permission-matrix.md 4장).
"""

from __future__ import annotations

from datetime import date
from typing import Any

from careersignal.domain.permissions import Component
from careersignal.repositories.base import Repository

GRAPH_NODES = "knowledge_nodes"
GRAPH_EDGES = "knowledge_edges"

EVIDENCE_SEPARATOR = "|"
"""복합키 근거를 `evidence_id` 한 값으로 잇는 문자. `graph/ontology.py` 와 같다.

값을 상수로 다시 선언한다. 저장소가 `graph/` 를 import 하면 층 빌더와 순환
import 가 된다.
"""


class GraphRepository(Repository):
    """두 그래프 저장소의 공통 조회와 저장.

    노드·엣지 표의 접근 방식은 층과 무관하게 같다. 구성요소는 하위 클래스가
    선언하며, 이 클래스는 `component` 를 갖지 않아 그대로 쓸 수 없다.

    활성 분류체계 버전 조회(`active_taxonomy_version`)는 `Repository` 에서 물려받는다.
    `SemanticGraphBuilder` 가 `RunContext.taxonomy_version_id` 를 요구하므로 그래프
    거래 안에서 그 값을 읽을 수 있어야 하고, 조회를 여기에 다시 적으면
    `requirement_taxonomy_versions` 의 부분 유니크 인덱스와 어긋난 사본이 하나 더
    생겨 통계 쪽과 다른 버전을 볼 수 있다.
    """

    _ONTOLOGY = """
        SELECT ontology_version, graph_layer, node_types, edge_types,
               allowed_connections, required_evidence_by_edge_type
        FROM ontology_versions
        WHERE ontology_version = %s
        ORDER BY graph_layer
    """
    """온톨로지 등록 목록. 두 층이 두 행이다.

    `ontology_versions` 는 운영자가 시드로만 관리한다. 어떤 구성요소도 쓰지 않으며
    이 조회는 읽기 전용이다(docs/permission-matrix.md 3장).
    """

    def ontology_rows(self, ontology_version: str) -> list[dict[str, Any]]:
        """`graph/ontology.py` 의 `Ontology.from_rows` 에 그대로 넣는다."""
        return self.unit.fetch_all(self._ONTOLOGY, (ontology_version,))

    def node_ids(self, ontology_version: str, graph_layer: str) -> set[str]:
        """이미 저장된 노드 식별자. 재실행의 중복이 여기서 갈린다."""
        rows = self.unit.fetch_all(
            """
            SELECT node_id FROM knowledge_nodes
            WHERE ontology_version = %s AND graph_layer = %s
            """,
            (ontology_version, graph_layer),
        )
        return {r["node_id"] for r in rows}

    def edge_ids(self, ontology_version: str, graph_layer: str) -> set[str]:
        rows = self.unit.fetch_all(
            """
            SELECT edge_id FROM knowledge_edges
            WHERE ontology_version = %s AND graph_layer = %s
            """,
            (ontology_version, graph_layer),
        )
        return {r["edge_id"] for r in rows}

    def add_node(self, values: dict[str, Any]) -> None:
        self.unit.insert(GRAPH_NODES, dict(values))

    def add_edge(self, values: dict[str, Any]) -> None:
        """`weight` 를 넣지 않는다. 집계 파이프라인이 D4 직후 채운다."""
        self.unit.insert(GRAPH_EDGES, dict(values))

    def node_count(self, ontology_version: str, graph_layer: str) -> int:
        return self.unit.fetch_value(
            """
            SELECT count(*) FROM knowledge_nodes
            WHERE ontology_version = %s AND graph_layer = %s
            """,
            (ontology_version, graph_layer),
        )

    def edge_count(self, ontology_version: str, graph_layer: str) -> int:
        return self.unit.fetch_value(
            """
            SELECT count(*) FROM knowledge_edges
            WHERE ontology_version = %s AND graph_layer = %s
            """,
            (ontology_version, graph_layer),
        )

    # ------------------------------------------------------------ 근거 실재
    _EVIDENCE_KEYS: dict[str, tuple[str, tuple[str, ...]]] = {}
    """근거 종류마다 조회할 표와 키 컬럼. 하위 클래스가 자기 층의 것만 선언한다."""

    def evidence_exists(self, evidence_kind: str, evidence_id: str) -> bool:
        """`evidence_id` 가 가리키는 행이 실제로 있는지 본다.

        표와 컬럼 이름은 `_EVIDENCE_KEYS` 의 고정 목록에서 온다. 값만 인자로
        넘기므로 조회 문자열에 외부 값이 들어가지 않는다.
        """
        target = self._EVIDENCE_KEYS.get(evidence_kind)
        if target is None:
            return False
        table, columns = target
        values = evidence_id.split(EVIDENCE_SEPARATOR)
        if len(values) != len(columns):
            return False
        where = " AND ".join(f"{column} = %s" for column in columns)
        found = self.unit.fetch_value(
            f"SELECT 1 FROM {table} WHERE {where} LIMIT 1", tuple(values)
        )
        return found is not None

    def _matches(self, sql: str, params: tuple[str, ...]) -> bool:
        """파생 일치 조회. 한 행이라도 있으면 참이다."""
        return self.unit.fetch_value(f"{sql} LIMIT 1", params) is not None


class SemanticGraphRepository(GraphRepository):
    """지식 구축 에이전트의 그래프 저장소.

    행 수준 정책이 이 구성요소의 INSERT 를 `graph_layer = 'semantic'` 과 사전
    semantic 엣지 여섯 종으로 제한한다. 코드의 정의는
    `domain/permissions.py` 의 `PRE_SEMANTIC_EDGE_TYPES` 다.
    """

    component = Component.AGENT_KNOWLEDGE

    _EVIDENCE_KEYS = {
        "assignment": ("posting_requirement_assignments", ("assignment_id",)),
        "capability_dimension_link": (
            "capability_dimension_links",
            ("capability_id", "dimension_id", "taxonomy_version_id"),
        ),
        "dimension_version_mapping": (
            "requirement_dimension_versions",
            ("dimension_version_id",),
        ),
        "wiki_prerequisites": (
            "wiki_evidence",
            ("revision_id", "field_name", "chunk_id"),
        ),
        "checklist_item": ("checklist_items", ("item_id",)),
        "study_track": ("study_tracks", ("track_id",)),
    }
    """semantic 층 근거의 자리. 목록은 `0002_seed_reference.sql` 의 시드와 같다."""

    # ------------------------------------------------------------ 노드 원천
    def job_role(self, job_role_id: str) -> dict[str, Any] | None:
        """`JobRole` 노드 하나. 직무가 없으면 구축의 전제가 깨진 것이다."""
        return self.unit.fetch_one(
            "SELECT job_role_id, display_name FROM job_roles WHERE job_role_id = %s",
            (job_role_id,),
        )

    _POSTINGS = """
        SELECT p.posting_id, p.company_id, c.display_name AS company_label,
               COALESCE(v.title, p.posting_id) AS posting_label
        FROM postings p
        JOIN companies c ON c.company_id = p.company_id
        LEFT JOIN LATERAL (
            SELECT pv.title
            FROM posting_versions pv
            WHERE pv.posting_id = p.posting_id
              AND pv.dataset_version = %(dataset_version)s
            ORDER BY pv.posted_at DESC NULLS LAST, pv.posting_version_id
            LIMIT 1
        ) v ON true
        WHERE p.job_role_id = %(job_role_id)s
          AND EXISTS (
            SELECT 1 FROM posting_versions pv2
            WHERE pv2.posting_id = p.posting_id
              AND pv2.dataset_version = %(dataset_version)s
          )
        ORDER BY p.posting_id
    """
    """공고와 그 공고를 낸 회사.

    데이터셋 버전에 판이 있는 공고만 고른다. 모집단의 단위가
    `posting_version_id` 이므로(docs/erd.md 4.6) 이 버전에 판이 없는 공고는 어떤
    지표에도 들어가지 않는다.

    라벨은 가장 최근 판의 제목이다. 게시 시점이 같으면 판 식별자로 가르므로
    재실행이 같은 라벨을 고른다.
    """

    def postings(self, job_role_id: str, dataset_version: str) -> list[dict[str, Any]]:
        """`Posting` 과 `Company` 노드, `POSTED_BY` 엣지의 원천."""
        return self.unit.fetch_all(
            self._POSTINGS,
            {"job_role_id": job_role_id, "dataset_version": dataset_version},
        )

    _MEMBERSHIPS = """
        SELECT m.membership_id, m.company_id, m.cluster_id,
               cl.display_name AS cluster_label, m.valid_from, m.valid_to
        FROM company_cluster_memberships m
        JOIN company_clusters cl ON cl.cluster_id = m.cluster_id
        WHERE m.company_id IN (
            SELECT company_id FROM postings WHERE job_role_id = %(job_role_id)s
          )
          AND m.valid_from <= %(as_of_date)s
          AND (m.valid_to IS NULL OR m.valid_to >= %(as_of_date)s)
        ORDER BY m.company_id, m.cluster_id, m.membership_id
    """
    """기준일에 유효한 기업군 소속.

    소속의 유일한 원천은 이 표다(docs/erd.md 3.4). 기간 해석은 실행 봉투의
    `as_of_date` 로 하며 조건을 집계와 같게 둔다. 엣지의 `valid_from` 과
    `valid_to` 는 membership 의 값을 그대로 옮긴다.
    """

    def cluster_memberships(
        self, job_role_id: str, as_of_date: date
    ) -> list[dict[str, Any]]:
        """`CompanyCluster` 노드와 `BELONGS_TO_CLUSTER` 엣지의 원천."""
        return self.unit.fetch_all(
            self._MEMBERSHIPS, {"job_role_id": job_role_id, "as_of_date": as_of_date}
        )

    _DIMENSIONS = """
        SELECT d.dimension_id, d.dimension_kind,
               dv.internal_canonical_label AS label
        FROM requirement_dimension_versions dv
        JOIN requirement_dimensions d ON d.dimension_id = dv.dimension_id
        WHERE dv.taxonomy_version_id = %(taxonomy_version_id)s
          AND dv.lifecycle_status = 'active'
        ORDER BY d.dimension_id
    """
    """활성 차원.

    `lifecycle_status` 가 `active` 인 행만 고른다. 승격 전 후보를 그래프에 올리면
    심사를 거치지 않은 차원이 탐색 결과에 나타난다. 첫 실행에서 이 조회는 빈
    목록을 준다.
    """

    def active_dimensions(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        """`RequirementDimension` 과 `Technology` 노드의 원천."""
        return self.unit.fetch_all(
            self._DIMENSIONS, {"taxonomy_version_id": taxonomy_version_id}
        )

    def active_capabilities(self, job_role_id: str) -> list[dict[str, Any]]:
        """`Capability` 노드의 원천."""
        return self.unit.fetch_all(
            """
            SELECT capability_id, canonical_label
            FROM capabilities
            WHERE job_role_id = %s AND is_active
            ORDER BY capability_id
            """,
            (job_role_id,),
        )

    _CAPABILITY_LINKS = """
        SELECT l.capability_id, l.dimension_id, l.taxonomy_version_id
        FROM capability_dimension_links l
        JOIN capabilities c ON c.capability_id = l.capability_id
        JOIN requirement_dimension_versions dv
          ON dv.dimension_id = l.dimension_id
         AND dv.taxonomy_version_id = l.taxonomy_version_id
        WHERE l.taxonomy_version_id = %(taxonomy_version_id)s
          AND c.is_active
          AND dv.lifecycle_status = 'active'
        ORDER BY l.capability_id, l.dimension_id
    """
    """역량과 차원의 연결. `REQUIRES_CAPABILITY` 의 근거다."""

    def capability_links(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return self.unit.fetch_all(
            self._CAPABILITY_LINKS, {"taxonomy_version_id": taxonomy_version_id}
        )

    _CAPABILITY_STANDARDS = """
        SELECT l.capability_id, dv.standard_id, s.title AS standard_label,
               dv.dimension_version_id
        FROM capability_dimension_links l
        JOIN capabilities c ON c.capability_id = l.capability_id
        JOIN requirement_dimension_versions dv
          ON dv.dimension_id = l.dimension_id
         AND dv.taxonomy_version_id = l.taxonomy_version_id
        JOIN standards s ON s.standard_id = dv.standard_id
        WHERE l.taxonomy_version_id = %(taxonomy_version_id)s
          AND c.is_active
          AND dv.lifecycle_status = 'active'
          AND dv.standard_mapping_status <> 'unmapped'
        ORDER BY l.capability_id, dv.standard_id, dv.dimension_version_id
    """
    """역량이 닿는 표준.

    표준 연결은 차원 버전이 갖는다(docs/erd.md 7.4). 역량에서 표준으로 가는 길은
    역량–차원 연결을 지나므로, 한 역량이 여러 차원으로 같은 표준에 닿으면 행이
    여럿이다. 엣지는 하나이며 근거는 정렬에서 첫 차원 버전이다.
    """

    def capability_standards(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        """`Standard` 노드와 `MAPS_TO_STANDARD` 엣지의 원천."""
        return self.unit.fetch_all(
            self._CAPABILITY_STANDARDS, {"taxonomy_version_id": taxonomy_version_id}
        )

    _ASSIGNMENTS = """
        SELECT a.assignment_id, p.posting_id, a.dimension_id
        FROM posting_requirement_assignments a
        JOIN requirement_mentions m ON m.mention_id = a.mention_id
        JOIN posting_versions pv ON pv.posting_version_id = m.posting_version_id
        JOIN postings p ON p.posting_id = pv.posting_id
        WHERE a.taxonomy_version_id = %(taxonomy_version_id)s
          AND m.dataset_version = %(dataset_version)s
          AND p.job_role_id = %(job_role_id)s
        ORDER BY p.posting_id, a.dimension_id, a.assignment_id
    """
    """정규화 할당.

    한 공고가 같은 차원을 여러 번 요구해도 정규화된 요구는 하나다. 정렬이
    고정이므로 엣지의 근거는 언제나 그 짝의 첫 할당이다.
    """

    def assignments(
        self, taxonomy_version_id: str, dataset_version: str, job_role_id: str
    ) -> list[dict[str, Any]]:
        """`REQUIRES` 엣지의 원천."""
        return self.unit.fetch_all(
            self._ASSIGNMENTS,
            {
                "taxonomy_version_id": taxonomy_version_id,
                "dataset_version": dataset_version,
                "job_role_id": job_role_id,
            },
        )

    # ------------------------------------------------------------ 파생 일치
    _DERIVED_MEMBERSHIP = """
        SELECT 1 FROM company_cluster_memberships
        WHERE membership_id = %s AND company_id = %s AND cluster_id = %s
    """

    _DERIVED_ASSIGNMENT = """
        SELECT 1
        FROM posting_requirement_assignments a
        JOIN requirement_mentions m ON m.mention_id = a.mention_id
        JOIN posting_versions pv ON pv.posting_version_id = m.posting_version_id
        WHERE a.assignment_id = %s AND pv.posting_id = %s AND a.dimension_id = %s
    """

    _DERIVED_CAPABILITY_LINK = """
        SELECT 1 FROM capability_dimension_links
        WHERE capability_id = %s AND dimension_id = %s AND taxonomy_version_id = %s
    """

    def derivation_matches(
        self,
        edge_type: str,
        evidence_id: str | None,
        src_ref_id: str,
        dst_ref_id: str,
    ) -> bool:
        """파생 엣지의 두 끝이 원천 행과 같은 짝인지 본다.

        근거 행이 있어도 그 행이 다른 두 끝을 잇고 있으면 엣지가 원천과 어긋난
        것이다. 파생이 아닌 엣지는 외래키로 성립하므로 참이다.
        """
        if not evidence_id:
            return False
        if edge_type == "BELONGS_TO_CLUSTER":
            return self._matches(
                self._DERIVED_MEMBERSHIP, (evidence_id, src_ref_id, dst_ref_id)
            )
        if edge_type == "REQUIRES":
            return self._matches(
                self._DERIVED_ASSIGNMENT, (evidence_id, src_ref_id, dst_ref_id)
            )
        if edge_type == "REQUIRES_CAPABILITY":
            parts = evidence_id.split(EVIDENCE_SEPARATOR)
            if len(parts) != 3 or parts[0] != dst_ref_id or parts[1] != src_ref_id:
                return False
            return self._matches(self._DERIVED_CAPABILITY_LINK, tuple(parts))
        return True

    def capability_prerequisites(
        self, job_role_id: str, knowledge_version: str | None
    ) -> list[dict[str, Any]]:
        """`PREREQUISITE_OF` 엣지의 원천.

        선수 관계는 관측이 아니라 판단이므로 Wiki 근거 또는 공공 표준을 요구한다
        (docs/ontology-v1.md 4장). Wiki 는 D3b 이고 표준 사이의 선수 관계를 담는
        표는 없으므로 현재 원천이 없다. 빈 목록을 주면 빌더가 이 유형을 건너뛰고
        그 사실을 결과에 남긴다.

        한 행은 `src_capability_id`, `dst_capability_id`, `evidence_id` 를 갖는다.
        """
        return []


__all__ = [
    "EVIDENCE_SEPARATOR",
    "GRAPH_EDGES",
    "GRAPH_NODES",
    "GraphRepository",
    "SemanticGraphRepository",
]
