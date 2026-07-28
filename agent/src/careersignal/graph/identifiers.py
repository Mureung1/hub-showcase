"""그래프 노드·엣지의 결정적 식별자.

접두사 규약은 docs/erd.md 2.2이고 노드의 유일 제약은 8.2다. 재료를 해시해
식별자를 만드는 방식은 `taxonomy/discovery.py` 의 `candidate_identifier` 와 같다.

식별자를 재료에서 계산하면 재실행이 같은 원소에 같은 값을 준다. 저장 전에 이미
있는 식별자와 대조하는 것만으로 중복을 막을 수 있고, 순서가 흔들려도 결과가
같다.

노드의 재료는 `knowledge_nodes` 의 유일 제약 컬럼과 정확히 같다. 유일 제약이
막는 것과 식별자가 같다고 보는 것이 어긋나면 재실행이 제약 위반으로 끝난다.

엣지에는 유일 제약이 없으므로 식별자가 엣지의 정체성을 정한다. 재료는 층, 유형,
두 끝점, 온톨로지 버전, 분류체계 버전이다. `evidence_id` 는 재료에 넣지 않는다.
한 공고에서 같은 차원을 가리키는 할당이 여럿이어도 정규화된 요구는 하나이며,
근거를 재료에 넣으면 같은 의미 관계가 엣지 여럿으로 갈린다. 저장하는
`evidence_id` 는 정렬된 원천 행의 첫 값이다.

분석 버전은 재료에 넣지 않는다. 노드의 유일 제약이 분석 버전을 포함하지 않아
노드가 분석 버전을 넘어 재사용되므로, 엣지만 분석 버전마다 갈리면 두 표의 정체성
기준이 어긋난다. 재구축의 기준은 분류체계 버전과 온톨로지 버전이다
(docs/adr/0007-knowledge-layer-after-aggregation.md).
"""

from __future__ import annotations

import hashlib

NODE_PREFIX = "node_"
"""`knowledge_nodes.node_id` 의 접두사."""

EDGE_PREFIX = "edge_"
"""`knowledge_edges.edge_id` 의 접두사."""

DIGEST_LENGTH = 24
"""해시에서 잘라 쓰는 길이. 후보 식별자와 같은 길이를 쓴다."""

MATERIAL_SEPARATOR = ":"
"""재료를 잇는 문자. 앞쪽 자리가 통제된 어휘라 경계가 흔들리지 않는다."""


def _digest(parts: tuple[str, ...]) -> str:
    material = MATERIAL_SEPARATOR.join(parts).encode()
    return hashlib.sha256(material).hexdigest()[:DIGEST_LENGTH]


def node_identifier(
    graph_layer: str,
    node_type: str,
    ref_table: str,
    ref_id: str,
    ontology_version: str,
) -> str:
    """같은 유일 키를 갖는 노드는 같은 식별자다.

    재료는 `UNIQUE (graph_layer, node_type, ref_table, ref_id, ontology_version)`
    다. `dimension_kind` 가 `technology` 인 차원은 `Technology` 로만 만들므로 같은
    `ref_id` 가 두 유형으로 나타나지 않는다.
    """
    return NODE_PREFIX + _digest(
        (graph_layer, node_type, ref_table, ref_id, ontology_version)
    )


def edge_identifier(
    graph_layer: str,
    edge_type: str,
    src_node_id: str,
    dst_node_id: str,
    ontology_version: str,
    taxonomy_version_id: str | None = None,
) -> str:
    """같은 층의 같은 두 끝을 잇는 같은 유형의 엣지는 하나다.

    분류체계에 의존하지 않는 엣지는 `taxonomy_version_id` 가 비고, 그 자리에 빈
    문자열이 들어간다. 의존 엣지는 분류체계 버전이 바뀌면 다른 엣지가 된다.
    """
    return EDGE_PREFIX + _digest(
        (
            graph_layer,
            edge_type,
            src_node_id,
            dst_node_id,
            ontology_version,
            taxonomy_version_id or "",
        )
    )


__all__ = [
    "DIGEST_LENGTH",
    "EDGE_PREFIX",
    "MATERIAL_SEPARATOR",
    "NODE_PREFIX",
    "edge_identifier",
    "node_identifier",
]
