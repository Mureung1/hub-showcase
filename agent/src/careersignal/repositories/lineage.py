"""계보 층 그래프 저장소.

계보 기록 파이프라인이 사용한다. 쓰기 범위는 docs/permission-matrix.md 3장의
`knowledge_nodes`·`knowledge_edges` Provenance 묶음과 사후 semantic 묶음,
`graph_paths` 이며, 컬럼은 docs/erd.md 8.2·8.3이다.

계보 기록은 외래키를 그래프 표현으로 옮기는 결정적 변환이다. 같은 입력에 같은
엣지를 낸다. 판단이 개입하지 않으므로 에이전트가 쓰지 않는다. 근거는
docs/adr/0008-lineage-write-path.md 다.

읽기는 전 산출물 표에 걸친다(docs/permission-matrix.md 4장). 원천이 아직 비어
있는 유형은 빈 목록을 주고, 빌더가 그 유형을 건너뛴 사실을 결과에 남긴다.
"""

from __future__ import annotations

from typing import Any

from careersignal.domain.permissions import Component
from careersignal.repositories.knowledge_graph import (
    EVIDENCE_SEPARATOR,
    GraphRepository,
)


class LineageGraphRepository(GraphRepository):
    """계보 기록 파이프라인의 그래프 저장소.

    행 수준 정책이 이 구성요소의 엣지 INSERT 를 provenance 층과 사후 semantic
    엣지 세 종으로 제한한다(`0005_graph_policies.sql`). 사전 semantic 엣지를
    만드는 메서드는 이 저장소에 없다.
    """

    component = Component.PIPE_LINEAGE

    _EVIDENCE_KEYS = {
        "requirement_mention": ("requirement_mentions", ("mention_id",)),
        "assignment": ("posting_requirement_assignments", ("assignment_id",)),
        "statistic_fact": ("statistics_facts", ("fact_id",)),
        "analysis_claim_evidence": (
            "analysis_claim_evidence",
            ("claim_id", "support_type", "support_id", "relation"),
        ),
        "checklist_item": ("checklist_items", ("item_id",)),
        "roadmap_item_fill": ("roadmap_item_fills", ("roadmap_item_id", "concept_id")),
        "agent_run": ("agent_runs", ("agent_run_id",)),
    }
    """provenance 층 근거의 자리. 목록은 `0002_seed_reference.sql` 의 시드와 같다."""

    # ------------------------------------------------------------ 층 사이 연결
    def semantic_nodes(self, ontology_version: str) -> list[dict[str, Any]]:
        """지식 구축 에이전트가 만든 semantic 노드.

        `ASSIGNED_TO` 의 도착점이 semantic 노드이므로 계보 층이 이 목록에서
        끝점을 찾는다. 계보 기록은 semantic 노드를 만들지 않는다. 노드가 아직
        없으면 그 엣지를 만들지 않고 폐기 사유를 남긴다.
        """
        return self.unit.fetch_all(
            """
            SELECT node_id, node_type, ref_id
            FROM knowledge_nodes
            WHERE ontology_version = %s AND graph_layer = 'semantic'
            ORDER BY node_id
            """,
            (ontology_version,),
        )

    # ------------------------------------------------------------ D0~D2 원천
    def snapshots(self, dataset_version: str) -> list[dict[str, Any]]:
        """`SourceSnapshot` 노드의 원천. 라벨은 출처 주소다."""
        return self.unit.fetch_all(
            """
            SELECT s.snapshot_id, o.url AS label
            FROM source_snapshots s
            JOIN sources o ON o.source_id = s.source_id
            WHERE s.dataset_version = %s
            ORDER BY s.snapshot_id
            """,
            (dataset_version,),
        )

    def chunks(self, dataset_version: str) -> list[dict[str, Any]]:
        """`Chunk` 노드와 `PART_OF` 엣지의 원천.

        라벨은 섹션과 순번이다. 청크 본문을 그래프에 옮기지 않는다. 본문의
        진실의 원천은 `source_chunks` 이며 노드는 경로 탐색을 위한 표현이다.
        """
        return self.unit.fetch_all(
            """
            SELECT chunk_id, snapshot_id, ordinal,
                   COALESCE(section, '') AS section
            FROM source_chunks
            WHERE dataset_version = %s
            ORDER BY snapshot_id, ordinal, chunk_id
            """,
            (dataset_version,),
        )

    def mentions(self, dataset_version: str) -> list[dict[str, Any]]:
        """`RequirementMention` 노드와 `EVIDENCED_BY` 엣지의 원천."""
        return self.unit.fetch_all(
            """
            SELECT mention_id, chunk_id, raw_expression
            FROM requirement_mentions
            WHERE dataset_version = %s
            ORDER BY mention_id
            """,
            (dataset_version,),
        )

    def assignments(
        self, taxonomy_version_id: str, dataset_version: str
    ) -> list[dict[str, Any]]:
        """`Assignment` 노드와 `ASSIGNED_TO` 엣지의 원천.

        한 mention 은 분류체계 버전당 하나의 차원에만 할당된다(docs/erd.md 7.13).
        """
        return self.unit.fetch_all(
            """
            SELECT a.assignment_id, a.mention_id, a.dimension_id,
                   a.normalized_label, d.dimension_kind
            FROM posting_requirement_assignments a
            JOIN requirement_mentions m ON m.mention_id = a.mention_id
            JOIN requirement_dimensions d ON d.dimension_id = a.dimension_id
            WHERE a.taxonomy_version_id = %(taxonomy_version_id)s
              AND m.dataset_version = %(dataset_version)s
            ORDER BY a.assignment_id
            """,
            {
                "taxonomy_version_id": taxonomy_version_id,
                "dataset_version": dataset_version,
            },
        )

    # ------------------------------------------------------------ D4·D5 원천
    def statistic_facts(self, analysis_version: str) -> list[dict[str, Any]]:
        """`StatisticFact` 노드의 원천."""
        return self.unit.fetch_all(
            """
            SELECT fact_id, metric_family, measure, dimension_id
            FROM statistics_facts
            WHERE analysis_version = %s
            ORDER BY fact_id
            """,
            (analysis_version,),
        )

    def analysis_claims(self, analysis_version: str) -> list[dict[str, Any]]:
        """`AnalysisClaim` 노드의 원천."""
        return self.unit.fetch_all(
            """
            SELECT claim_id, claim_type, claim_text
            FROM analysis_claims
            WHERE analysis_version = %s
            ORDER BY claim_id
            """,
            (analysis_version,),
        )

    def claim_evidence(self, analysis_version: str) -> list[dict[str, Any]]:
        """`SUPPORTED_BY` 와 `CONTRADICTED_BY` 엣지의 원천.

        주장과 근거 연결의 진실의 원천은 `analysis_claim_evidence` 다
        (docs/erd.md 11.5). 두 엣지는 `relation` 으로 갈린다.
        """
        return self.unit.fetch_all(
            """
            SELECT e.claim_id, e.support_type, e.support_id, e.relation
            FROM analysis_claim_evidence e
            JOIN analysis_claims c ON c.claim_id = e.claim_id
            WHERE c.analysis_version = %s
              AND e.support_type IN ('chunk', 'statistic_fact')
            ORDER BY e.claim_id, e.support_type, e.support_id, e.relation
            """,
            (analysis_version,),
        )

    def checklist_items(self, analysis_version: str) -> list[dict[str, Any]]:
        """`ChecklistItem` 노드의 원천."""
        return self.unit.fetch_all(
            """
            SELECT item_id, concept_id, scope_level, scope_id, title
            FROM checklist_items
            WHERE analysis_version = %s
            ORDER BY item_id
            """,
            (analysis_version,),
        )

    def roadmap_items(self, analysis_version: str) -> list[dict[str, Any]]:
        """`RoadmapItem` 노드의 원천."""
        return self.unit.fetch_all(
            """
            SELECT roadmap_item_id, scope_level, scope_id, step_order, title
            FROM roadmap_items
            WHERE analysis_version = %s
            ORDER BY roadmap_item_id
            """,
            (analysis_version,),
        )

    _ROADMAP_FILLS = """
        SELECT f.roadmap_item_id, f.concept_id, i.item_id
        FROM roadmap_item_fills f
        JOIN roadmap_items r ON r.roadmap_item_id = f.roadmap_item_id
        JOIN checklist_items i
          ON i.concept_id = f.concept_id
         AND i.analysis_version = r.analysis_version
         AND i.scope_level = r.scope_level
         AND i.scope_id = r.scope_id
        WHERE r.analysis_version = %s
        ORDER BY f.roadmap_item_id, i.item_id
    """
    """`FILLS` 엣지의 원천.

    충족 연결은 개념을 가리키고(`roadmap_item_fills.concept_id`) 노드는 항목을
    가리킨다. 같은 분석 버전과 같은 범위 안에서 개념은 항목 하나에 대응하므로
    (`checklist_items` 의 UNIQUE) 이 조인이 항목 하나를 준다.
    """

    def roadmap_fills(self, analysis_version: str) -> list[dict[str, Any]]:
        return self.unit.fetch_all(self._ROADMAP_FILLS, (analysis_version,))

    def analysis_outputs(self, analysis_version: str) -> list[dict[str, Any]]:
        """`AnalysisOutput` 노드의 원천."""
        return self.unit.fetch_all(
            """
            SELECT output_id, output_type, produced_by_agent, scope_level, scope_id
            FROM analysis_outputs
            WHERE analysis_version = %s
            ORDER BY output_id
            """,
            (analysis_version,),
        )

    def agent_runs(self, analysis_version: str) -> list[dict[str, Any]]:
        """`AgentRun` 노드의 원천."""
        return self.unit.fetch_all(
            """
            SELECT agent_run_id, agent_name, iteration
            FROM agent_runs
            WHERE analysis_version = %s
            ORDER BY agent_run_id
            """,
            (analysis_version,),
        )

    _OUTPUT_RUNS = """
        SELECT o.output_id, r.agent_run_id
        FROM analysis_outputs o
        JOIN LATERAL (
            SELECT ar.agent_run_id
            FROM agent_runs ar
            WHERE ar.analysis_version = o.analysis_version
              AND ar.agent_name = o.produced_by_agent
            ORDER BY ar.iteration DESC, ar.agent_run_id
            LIMIT 1
        ) r ON true
        WHERE o.analysis_version = %s
        ORDER BY o.output_id
    """
    """`PRODUCED_BY` 엣지의 원천.

    `analysis_outputs` 는 실행 식별자 컬럼을 갖지 않는다(docs/erd.md 11.3).
    분석 버전과 `produced_by_agent` 로 실행을 찾고, 같은 에이전트의 실행이
    여럿이면 마지막 반복을 고른다. 반복이 같으면 실행 식별자로 가르므로
    재실행이 같은 실행을 고른다.
    """

    def output_runs(self, analysis_version: str) -> list[dict[str, Any]]:
        return self.unit.fetch_all(self._OUTPUT_RUNS, (analysis_version,))

    def fact_inputs(self, analysis_version: str) -> list[dict[str, Any]]:
        """`COMPUTED_FROM` 엣지의 원천.

        지표와 그 지표가 쓴 할당을 잇는 표가 없다. 어떤 할당이 한 지표의 분자와
        분모에 들어갔는지는 집계 파이프라인이 아는 사실이며, 차원과 범위만으로
        다시 맞추면 실제로 쓰이지 않은 할당까지 이어진다. 원천이 생기기 전에는
        빈 목록을 준다.

        한 행은 `fact_id`, `assignment_id` 를 갖는다.
        """
        return []

    def item_claims(self, analysis_version: str) -> list[dict[str, Any]]:
        """`DERIVED_FROM` 엣지의 원천.

        체크리스트 항목과 주장을 잇는 표가 없다(docs/erd.md 11.7). 원천이 생기기
        전에는 빈 목록을 준다.

        한 행은 `item_id`, `claim_id` 를 갖는다.
        """
        return []

    # ------------------------------------------------------------ 파생 일치
    _DERIVED_ASSIGNMENT = """
        SELECT 1 FROM posting_requirement_assignments
        WHERE assignment_id = %s AND mention_id = %s AND dimension_id = %s
    """

    _DERIVED_CLAIM_EVIDENCE = """
        SELECT 1 FROM analysis_claim_evidence
        WHERE claim_id = %s AND support_type = %s AND support_id = %s
          AND relation = %s
    """

    _DERIVED_FILL = """
        SELECT 1
        FROM roadmap_item_fills f
        JOIN checklist_items i ON i.concept_id = f.concept_id
        WHERE f.roadmap_item_id = %s AND f.concept_id = %s AND i.item_id = %s
    """

    def derivation_matches(
        self,
        edge_type: str,
        evidence_id: str | None,
        src_ref_id: str,
        dst_ref_id: str,
    ) -> bool:
        """파생 엣지의 두 끝이 원천 행과 같은 짝인지 본다."""
        if not evidence_id:
            return False
        if edge_type == "ASSIGNED_TO":
            return self._matches(
                self._DERIVED_ASSIGNMENT, (evidence_id, src_ref_id, dst_ref_id)
            )
        if edge_type in ("SUPPORTED_BY", "CONTRADICTED_BY"):
            parts = evidence_id.split(EVIDENCE_SEPARATOR)
            if len(parts) != 4 or parts[0] != src_ref_id or parts[2] != dst_ref_id:
                return False
            return self._matches(self._DERIVED_CLAIM_EVIDENCE, tuple(parts))
        if edge_type == "FILLS":
            parts = evidence_id.split(EVIDENCE_SEPARATOR)
            if len(parts) != 2 or parts[0] != src_ref_id:
                return False
            return self._matches(self._DERIVED_FILL, (parts[0], parts[1], dst_ref_id))
        return True


__all__ = ["LineageGraphRepository"]
