package com.punchman.devpulse.pathfinder;

import java.util.List;

public sealed interface TopologicalSortResult {

    record Sorted(List<CertificationNode> order) implements TopologicalSortResult {
    }

    /**
     * stuckNodes는 순환에 속한 노드뿐 아니라, 그 순환 때문에 진입차수가 0이 되지 못한
     * 하류(downstream) 노드까지 포함하는 상위집합(superset)이다.
     */
    record CycleDetected(List<CertificationNode> stuckNodes) implements TopologicalSortResult {
    }
}
