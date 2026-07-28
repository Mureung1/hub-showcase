"""경로 캐시와 근거 집합 저장소.

표는 docs/erd.md 8.4의 `graph_paths` 와 12장의 `evidence_sets`·
`evidence_set_members` 다. 탐색이 읽는 인접 관계는 8.2·8.3의 노드·엣지 표에서
가져온다.

`graph_paths` 의 쓰기 구성요소는 계보 기록 파이프라인 하나다. 근거는
docs/permission-matrix.md 3장의 쓰기 범위 표이며, `0004_component_grants.sql` 이
`cs_pipe_lineage` 에만 `INSERT`·`UPDATE`·`DELETE` 를 준다. 그래서
`GraphPathRepository.component` 는 `PIPE_LINEAGE` 다. 탐색에 쓰는 조회는 모든
구성요소에 열려 있으나(같은 문서 4장) 캐시를 채우는 실행은 이 파이프라인의 일이다.

근거 집합은 계측 표이며 전 실행 구성요소가 INSERT 한다(같은 문서 3.1). 구성요소
하나에 묶으면 해석·전략·로드맵 에이전트가 자기 묶음을 기록하지 못하므로,
`EvidenceSetRepository` 는 `TelemetryRepository` 와 같이 구성요소 제한 없이 거래만
받는다. `UPDATE` 와 `DELETE` 는 트리거가 막으므로 갱신하지 않고 새 집합을 만든다.

`retrieval_runs` 는 오케스트레이터 봉투를 요구하는 별도 단위다. 이 저장소는 그 표에
쓰지 않고 `retrieval_run_id` 를 인자로 받는다.
"""

from __future__ import annotations

from typing import Any

from careersignal.contracts.verification import TypedVerdict
from careersignal.domain.permissions import Component, require_write
from careersignal.repositories.base import Unit
from careersignal.repositories.knowledge_graph import GraphRepository

GRAPH_PATHS = "graph_paths"
EVIDENCE_SETS = "evidence_sets"
EVIDENCE_SET_MEMBERS = "evidence_set_members"

TRAVERSABLE_STATUS = str(TypedVerdict.VERIFIED)
"""탐색이 따라가는 엣지의 `verification_status`.

검증이 불일치를 찾아 상태를 낮춘 엣지는 경로에 넣지 않는다. 폐기 대상 엣지가 캐시로
들어가면 화면의 근거 경로가 폐기된 관계를 가리킨다.
"""


class GraphPathRepository(GraphRepository):
    """탐색용 인접 조회와 경로 캐시.

    `GraphRepository` 를 이어받아 `ontology_rows` 를 그대로 쓴다. 노드·엣지 표의
    쓰기 메서드도 함께 딸려 오지만 이 구성요소는 계보 층과 사후 semantic 묶음의
    쓰기 범위를 이미 갖는다(docs/permission-matrix.md 3장).
    """

    component = Component.PIPE_LINEAGE

    _TRAVERSAL_NODES = """
        SELECT node_id, node_type, graph_layer
        FROM knowledge_nodes
        WHERE ontology_version = %s
        ORDER BY node_id
    """
    """탐색이 읽는 노드. 두 층을 함께 가져온다.

    `ASSIGNED_TO` 가 provenance 에서 semantic 으로 넘어가므로 층을 나눠 가져오면
    그 홉의 도착 노드를 찾지 못한다.
    """

    def traversal_nodes(self, ontology_version: str) -> list[dict[str, Any]]:
        return self.unit.fetch_all(self._TRAVERSAL_NODES, (ontology_version,))

    _TRAVERSAL_EDGES = """
        SELECT edge_id, edge_type, graph_layer, src_node_id, dst_node_id, weight
        FROM knowledge_edges
        WHERE ontology_version = %(ontology_version)s
          AND verification_status = %(verification_status)s
        ORDER BY src_node_id, edge_type, dst_node_id, edge_id
    """
    """탐색이 읽는 엣지.

    `weight` 를 함께 가져온다. 집계 이전에는 전부 비어 있고, 비어 있는 동안에도
    탐색은 동작한다(docs/ontology-v1.md 6장). 정렬을 고정해 인접 관계의 구성
    순서가 실행마다 같게 한다.
    """

    def traversal_edges(self, ontology_version: str) -> list[dict[str, Any]]:
        return self.unit.fetch_all(
            self._TRAVERSAL_EDGES,
            {
                "ontology_version": ontology_version,
                "verification_status": TRAVERSABLE_STATUS,
            },
        )

    # ------------------------------------------------------------ 경로 캐시
    _CACHED_PATHS = """
        SELECT path_id, path_type, node_sequence, edge_sequence, computed_at
        FROM graph_paths
        WHERE path_type = %(path_type)s
          AND taxonomy_version_id IS NOT DISTINCT FROM %(taxonomy_version_id)s
          AND knowledge_version IS NOT DISTINCT FROM %(knowledge_version)s
          AND analysis_version IS NOT DISTINCT FROM %(analysis_version)s
          AND graph_policy_version = %(graph_policy_version)s
        ORDER BY path_id
    """
    """캐시 키로 찾은 경로.

    네 버전 가운데 셋이 nullable 이므로 `IS NOT DISTINCT FROM` 으로 견준다. `=` 는
    NULL 을 만나면 참도 거짓도 아닌 값을 주어 키가 비어 있는 실행에서 언제나 캐시
    미스가 된다.
    """

    def cached_paths(self, key: dict[str, Any]) -> list[dict[str, Any]]:
        """캐시 적중 여부를 이 조회 하나로 판정한다. 빈 목록이 미스다."""
        return self.unit.fetch_all(self._CACHED_PATHS, key)

    def add_path(self, values: dict[str, Any]) -> None:
        """경로 한 줄을 담는다.

        `CHECK (array_length(edge_sequence,1) = array_length(node_sequence,1) - 1)`
        은 `graph/traversal.py` 의 모델이 먼저 지킨다.
        """
        self.unit.insert(GRAPH_PATHS, dict(values))

    _DELETE_STALE = """
        DELETE FROM graph_paths
        WHERE path_type = %(path_type)s
          AND NOT (
            taxonomy_version_id IS NOT DISTINCT FROM %(taxonomy_version_id)s
            AND knowledge_version IS NOT DISTINCT FROM %(knowledge_version)s
            AND analysis_version IS NOT DISTINCT FROM %(analysis_version)s
            AND graph_policy_version = %(graph_policy_version)s
          )
        RETURNING path_id
    """
    """이 키와 어긋나는 같은 유형의 캐시 행.

    `graph_paths` 는 캐시이며 자유롭게 삭제·재계산한다(docs/erd.md 14장). 지울지는
    부르는 쪽이 정한다. 활성 분석 버전의 경로를 화면이 조회하므로 새 버전을
    계산하는 실행이 옛 행을 함께 지우지 않는다.

    지운 식별자를 돌려받는다. `Unit` 은 삭제 전용 통로를 두지 않으므로 `RETURNING`
    으로 행 수를 센다.
    """

    def delete_stale_paths(self, key: dict[str, Any]) -> int:
        """무효화. 지운 행의 수를 돌려준다.

        쓰기 범위를 코드에서 먼저 막는다. `Unit.insert` 와 같은 검사를 지나야
        데이터베이스의 `GRANT` 앞에서 경계가 한 번 더 확인된다.
        """
        require_write(self.component, GRAPH_PATHS)
        return len(self.unit.fetch_all(self._DELETE_STALE, key))


class EvidenceSetRepository:
    """근거 집합 계측.

    구성요소 제한이 없다. 계측 표는 전 실행 구성요소가 INSERT 한다
    (docs/permission-matrix.md 3.1). `TelemetryRepository` 와 같은 모양이다.

    갱신하지 않는다. 고른 묶음이 달라지면 새 `evidence_set_id` 로 새 집합을 만든다.
    트리거가 `UPDATE` 와 `DELETE` 를 막으므로 이전 묶음의 판정 근거가 보존된다.
    """

    def __init__(self, unit: Unit) -> None:
        self.unit = unit

    def add_evidence_set(
        self,
        evidence_set_id: str,
        retrieval_run_id: str,
        objective_id: str,
        optimization_policy_version: str,
    ) -> None:
        """근거 집합 한 행.

        `retrieval_run_id` 는 인자로 받는다. `retrieval_runs` 는 오케스트레이터
        봉투를 요구하는 별도 단위이며 이 저장소가 만들지 않는다.
        """
        self.unit.insert(
            EVIDENCE_SETS,
            {
                "evidence_set_id": evidence_set_id,
                "retrieval_run_id": retrieval_run_id,
                "objective_id": objective_id,
                "optimization_policy_version": optimization_policy_version,
            },
        )

    def add_members(
        self, evidence_set_id: str, members: list[tuple[str, str]]
    ) -> None:
        """구성원 여러 행. `(candidate_id, slot_name)` 목록을 받는다.

        기본키가 `(evidence_set_id, candidate_id)` 이므로 한 후보는 한 집합에서
        슬롯 하나만 채운다.
        """
        rows = [
            {
                "evidence_set_id": evidence_set_id,
                "candidate_id": candidate_id,
                "slot_name": slot_name,
            }
            for candidate_id, slot_name in members
        ]
        self.unit.insert_many(EVIDENCE_SET_MEMBERS, rows)


__all__ = [
    "EVIDENCE_SETS",
    "EVIDENCE_SET_MEMBERS",
    "GRAPH_PATHS",
    "TRAVERSABLE_STATUS",
    "EvidenceSetRepository",
    "GraphPathRepository",
]
