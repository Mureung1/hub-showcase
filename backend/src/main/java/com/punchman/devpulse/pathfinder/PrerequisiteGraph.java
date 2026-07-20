package com.punchman.devpulse.pathfinder;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public record PrerequisiteGraph(List<CertificationNode> nodes, List<PrerequisiteEdge> edges) {

    public PrerequisiteGraph {
        nodes = List.copyOf(nodes);
        Set<Long> nodeIds = nodes.stream().map(CertificationNode::id).collect(Collectors.toSet());
        if (nodeIds.size() != nodes.size()) {
            throw new IllegalArgumentException("중복된 노드 id가 있습니다.");
        }

        Set<PrerequisiteEdge> deduped = new LinkedHashSet<>(edges);
        for (PrerequisiteEdge edge : deduped) {
            if (edge.prerequisiteId().equals(edge.certificationId())) {
                throw new IllegalArgumentException(
                        "자기 자신을 선수조건으로 가질 수 없습니다: " + edge.certificationId());
            }
            if (!nodeIds.contains(edge.prerequisiteId()) || !nodeIds.contains(edge.certificationId())) {
                throw new IllegalArgumentException("존재하지 않는 노드를 참조하는 엣지입니다: " + edge);
            }
        }
        edges = List.copyOf(deduped);
    }

    public static PrerequisiteGraph of(List<CertificationNode> nodes, List<PrerequisiteEdge> edges) {
        return new PrerequisiteGraph(nodes, edges);
    }
}
