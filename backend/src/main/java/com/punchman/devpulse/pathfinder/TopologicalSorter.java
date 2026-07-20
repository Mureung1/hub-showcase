package com.punchman.devpulse.pathfinder;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Kahn's algorithm 기반 위상 정렬. 순환이 있으면 처리되지 못한 노드를 CycleDetected로 보고한다.
 * 진입차수가 0인 후보가 여럿일 때는 항상 id 오름차순으로 꺼내 결과가 결정적(deterministic)이도록 한다.
 */
public final class TopologicalSorter {

    public TopologicalSortResult sort(PrerequisiteGraph graph) {
        Map<Long, CertificationNode> nodesById = graph.nodes().stream()
                .collect(Collectors.toMap(CertificationNode::id, Function.identity()));

        Map<Long, Integer> indegree = new HashMap<>();
        Map<Long, List<Long>> adjacency = new HashMap<>();
        for (CertificationNode node : graph.nodes()) {
            indegree.put(node.id(), 0);
            adjacency.put(node.id(), new ArrayList<>());
        }
        for (PrerequisiteEdge edge : graph.edges()) {
            adjacency.get(edge.prerequisiteId()).add(edge.certificationId());
            indegree.merge(edge.certificationId(), 1, Integer::sum);
        }

        TreeSet<Long> ready = new TreeSet<>();
        indegree.forEach((id, degree) -> {
            if (degree == 0) {
                ready.add(id);
            }
        });

        List<CertificationNode> order = new ArrayList<>();
        while (!ready.isEmpty()) {
            Long current = ready.pollFirst();
            order.add(nodesById.get(current));
            for (Long next : adjacency.get(current)) {
                int updated = indegree.merge(next, -1, Integer::sum);
                if (updated == 0) {
                    ready.add(next);
                }
            }
        }

        if (order.size() == graph.nodes().size()) {
            return new TopologicalSortResult.Sorted(List.copyOf(order));
        }

        Set<Long> processedIds = order.stream().map(CertificationNode::id).collect(Collectors.toSet());
        List<CertificationNode> stuckNodes = graph.nodes().stream()
                .filter(node -> !processedIds.contains(node.id()))
                .sorted(Comparator.comparing(CertificationNode::id))
                .toList();
        return new TopologicalSortResult.CycleDetected(stuckNodes);
    }
}
