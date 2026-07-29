"""선수 관계의 위상 정렬과 순환·누락 검사.

정의는 docs/backlog.md Phase 17-1·17-3, docs/agent-design.md 7.6·12장을 따른다.

`knowledge_edges` 의 `PREREQUISITE_OF` 는 `A → B` 가 "A 를 갖춰야 B 로 간다" 는 뜻이다
(`careersignal.graph.semantic.PREREQUISITE_OF`). 그 방향을 그대로 위상 정렬하면 선수
역량이 앞에 놓인 단계 순서가 나온다.

이 모듈은 순수 함수만 담는다. 저장소도 모델 제공자도 부르지 않는다. 값만 받아
순서와 판정을 돌려주므로 데이터베이스 없이 규칙 전체를 검사할 수 있다.

정렬은 결정적이다. 진입 차수가 0 인 후보가 여럿이면 **입력 순서가 앞선 것**을 고른다.
사전순으로 고르면 식별자를 바꾸는 것만으로 단계 순서가 흔들리고, 저장된 로드맵과
재실행 결과가 어긋난다. 입력 순서는 부르는 쪽이 정한 우선순위이므로 그것을 존중한다.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence

__all__ = [
    "CyclicPrerequisites",
    "find_cycle",
    "topological_order",
    "unlinked_concepts",
]


class CyclicPrerequisites(Exception):
    """선수 관계에 순환이 있다. 로드맵을 만들 수 없는 명시적 실패다.

    docs/architecture.md 14.1 의 규칙 검증이 "선수 관계 순환" 을 검사 대상으로 적는다.
    순환이 있으면 어떤 단계도 첫 번째가 될 수 없으므로, 임의의 순서를 지어내지 않고
    실패로 끝낸다.

    `cycle` 은 순환을 이루는 마디를 순환 방향대로 담는다. 첫 마디가 마지막 마디의
    다음이다. 수리 지시가 어느 엣지를 끊어야 하는지 알 수 있어야 한다.
    """

    def __init__(self, cycle: Sequence[str]) -> None:
        self.cycle: tuple[str, ...] = tuple(cycle)
        joined = " → ".join((*self.cycle, self.cycle[0])) if self.cycle else "(빈 순환)"
        super().__init__(f"선수 관계에 순환이 있다: {joined}")


def _adjacency(
    nodes: Sequence[str], edges: Iterable[tuple[str, str]]
) -> tuple[dict[str, list[str]], dict[str, int]]:
    """마디 목록 안의 엣지만 남긴 인접 목록과 진입 차수.

    목록 밖의 마디를 가리키는 엣지는 버린다. 선수 관계는 직무 전체의 역량 그래프에서
    오고 로드맵은 그중 일부만 다루므로, 범위 밖 역량이 진입 차수를 남기면 정렬이
    시작되지 못한다. 자기 자신을 가리키는 엣지도 버린다. 그것은 순환이 아니라 잡음이며
    `graph/ontology.py` 가 `PREREQUISITE_OF` 에만 자기 참조를 허용한다.
    """
    known = set(nodes)
    following: dict[str, list[str]] = {node: [] for node in nodes}
    indegree: dict[str, int] = {node: 0 for node in nodes}
    seen: set[tuple[str, str]] = set()

    for src, dst in edges:
        if src not in known or dst not in known or src == dst:
            continue
        if (src, dst) in seen:
            continue
        seen.add((src, dst))
        following[src].append(dst)
        indegree[dst] += 1

    return following, indegree


def topological_order(
    nodes: Sequence[str], edges: Iterable[tuple[str, str]]
) -> tuple[str, ...]:
    """선수 역량이 앞에 오도록 마디를 늘어놓는다.

    `edges` 의 한 쌍은 `(선수, 후속)` 이다. 중복 마디는 첫 자리만 남긴다.
    순환이 있으면 `CyclicPrerequisites` 를 던진다.
    """
    ordered_nodes = list(dict.fromkeys(nodes))
    following, indegree = _adjacency(ordered_nodes, edges)

    rank = {node: index for index, node in enumerate(ordered_nodes)}
    ready = sorted(
        (node for node in ordered_nodes if indegree[node] == 0),
        key=lambda node: rank[node],
    )

    result: list[str] = []
    while ready:
        node = ready.pop(0)
        result.append(node)
        for follower in following[node]:
            indegree[follower] -= 1
            if indegree[follower] == 0:
                # 입력 순서를 유지한 채 끼워 넣는다. 정렬을 다시 하지 않아도 같은 결과다.
                position = 0
                while position < len(ready) and rank[ready[position]] < rank[follower]:
                    position += 1
                ready.insert(position, follower)

    if len(result) != len(ordered_nodes):
        remaining = [node for node in ordered_nodes if node not in set(result)]
        raise CyclicPrerequisites(find_cycle(remaining, edges))

    return tuple(result)


def find_cycle(
    nodes: Sequence[str], edges: Iterable[tuple[str, str]]
) -> tuple[str, ...]:
    """순환 하나를 찾아 돌려준다. 없으면 빈 순서다.

    깊이 우선으로 훑으며 지금 따라온 경로에 다시 닿으면 그 자리부터가 순환이다.
    여러 순환이 있어도 하나만 돌려준다. 수리는 한 번에 하나씩 한다.
    """
    ordered_nodes = list(dict.fromkeys(nodes))
    following, _ = _adjacency(ordered_nodes, edges)

    visited: set[str] = set()
    path: list[str] = []
    on_path: set[str] = set()

    def walk(node: str) -> tuple[str, ...]:
        visited.add(node)
        path.append(node)
        on_path.add(node)
        for follower in following[node]:
            if follower in on_path:
                return tuple(path[path.index(follower) :])
            if follower not in visited:
                found = walk(follower)
                if found:
                    return found
        path.pop()
        on_path.discard(node)
        return ()

    for node in ordered_nodes:
        if node not in visited:
            found = walk(node)
            if found:
                return found
    return ()


def unlinked_concepts(
    concept_ids: Sequence[str], linked: Iterable[str]
) -> tuple[str, ...]:
    """어떤 단계에도 연결되지 않은 체크리스트 개념 (17-3).

    조용히 버리지 않는다. 체크리스트에 있는데 로드맵이 채우지 않는 개념은 사용자가
    준비할 방법을 얻지 못한 항목이며, 표시해야 다음 실행이 그것을 집는다.
    입력 순서를 유지한다.
    """
    filled = set(linked)
    return tuple(
        concept_id
        for concept_id in dict.fromkeys(concept_ids)
        if concept_id not in filled
    )
