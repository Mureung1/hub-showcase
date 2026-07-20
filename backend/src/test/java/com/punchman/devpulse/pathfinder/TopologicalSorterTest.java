package com.punchman.devpulse.pathfinder;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class TopologicalSorterTest {

    private static final CertificationNode A = new CertificationNode(1L, "A");
    private static final CertificationNode B = new CertificationNode(2L, "B");
    private static final CertificationNode C = new CertificationNode(3L, "C");
    private static final CertificationNode D = new CertificationNode(4L, "D");

    private final TopologicalSorter sorter = new TopologicalSorter();

    @Test
    void linearChainSortsInDependencyOrder() {
        PrerequisiteGraph graph = PrerequisiteGraph.of(
                List.of(A, B, C, D),
                List.of(edge(A, B), edge(B, C), edge(C, D)));

        TopologicalSortResult result = sorter.sort(graph);

        assertThat(result).isInstanceOf(TopologicalSortResult.Sorted.class);
        assertThat(sorted(result).order()).containsExactly(A, B, C, D);
    }

    @Test
    void independentComponentsInterleaveByIdAscending() {
        // 두 체인을 id가 교차하도록 배치해 순서가 입력 리스트 순서가 아니라 id 오름차순 tie-break로만 결정됨을 증명한다.
        CertificationNode a = new CertificationNode(1L, "A");
        CertificationNode c = new CertificationNode(2L, "C");
        CertificationNode b = new CertificationNode(3L, "B");
        CertificationNode d = new CertificationNode(4L, "D");

        PrerequisiteGraph graph = PrerequisiteGraph.of(
                List.of(a, b, c, d),
                List.of(edge(a, b), edge(c, d)));

        TopologicalSortResult result = sorter.sort(graph);

        assertThat(result).isInstanceOf(TopologicalSortResult.Sorted.class);
        assertThat(sorted(result).order()).containsExactly(a, c, b, d);
    }

    @Test
    void diamondDependencyResolvesWithoutDuplicates() {
        PrerequisiteGraph graph = PrerequisiteGraph.of(
                List.of(A, B, C, D),
                List.of(edge(A, B), edge(A, C), edge(B, D), edge(C, D)));

        TopologicalSortResult result = sorter.sort(graph);

        assertThat(result).isInstanceOf(TopologicalSortResult.Sorted.class);
        assertThat(sorted(result).order()).containsExactly(A, B, C, D);
    }

    @Test
    void twoNodeCycleIsDetected() {
        PrerequisiteGraph graph = PrerequisiteGraph.of(
                List.of(A, B),
                List.of(edge(A, B), edge(B, A)));

        TopologicalSortResult result = sorter.sort(graph);

        assertThat(result).isInstanceOf(TopologicalSortResult.CycleDetected.class);
        assertThat(cycle(result).stuckNodes()).containsExactly(A, B);
    }

    @Test
    void threeNodeCycleIsDetected() {
        PrerequisiteGraph graph = PrerequisiteGraph.of(
                List.of(A, B, C),
                List.of(edge(A, B), edge(B, C), edge(C, A)));

        TopologicalSortResult result = sorter.sort(graph);

        assertThat(result).isInstanceOf(TopologicalSortResult.CycleDetected.class);
        assertThat(cycle(result).stuckNodes()).containsExactly(A, B, C);
    }

    @Test
    void cycleWithDownstreamNodeReportsSuperset() {
        // A<->B 순환에 B->C가 딸려있으면, C는 순환 노드가 아니어도 진입차수가 0이 되지 못해 함께 stuck 처리된다.
        PrerequisiteGraph graph = PrerequisiteGraph.of(
                List.of(A, B, C),
                List.of(edge(A, B), edge(B, A), edge(B, C)));

        TopologicalSortResult result = sorter.sort(graph);

        assertThat(result).isInstanceOf(TopologicalSortResult.CycleDetected.class);
        assertThat(cycle(result).stuckNodes()).containsExactly(A, B, C);
    }

    @Test
    void cycleWithUnrelatedIndependentNodeExcludesIt() {
        // A->B->C->A 순환과 무관한 독립 노드 D는 stuckNodes에 포함되지 않아야 한다.
        PrerequisiteGraph graph = PrerequisiteGraph.of(
                List.of(A, B, C, D),
                List.of(edge(A, B), edge(B, C), edge(C, A)));

        TopologicalSortResult result = sorter.sort(graph);

        assertThat(result).isInstanceOf(TopologicalSortResult.CycleDetected.class);
        assertThat(cycle(result).stuckNodes()).containsExactly(A, B, C);
    }

    @Test
    void emptyGraphSortsToEmptyList() {
        PrerequisiteGraph graph = PrerequisiteGraph.of(List.of(), List.of());

        TopologicalSortResult result = sorter.sort(graph);

        assertThat(result).isInstanceOf(TopologicalSortResult.Sorted.class);
        assertThat(sorted(result).order()).isEmpty();
    }

    @Test
    void nodesWithoutEdgesSortByIdRegardlessOfInputOrder() {
        PrerequisiteGraph graph = PrerequisiteGraph.of(List.of(C, A, B), List.of());

        TopologicalSortResult result = sorter.sort(graph);

        assertThat(result).isInstanceOf(TopologicalSortResult.Sorted.class);
        assertThat(sorted(result).order()).containsExactly(A, B, C);
    }

    private static PrerequisiteEdge edge(CertificationNode prerequisite, CertificationNode certification) {
        return new PrerequisiteEdge(prerequisite.id(), certification.id());
    }

    private static TopologicalSortResult.Sorted sorted(TopologicalSortResult result) {
        return (TopologicalSortResult.Sorted) result;
    }

    private static TopologicalSortResult.CycleDetected cycle(TopologicalSortResult result) {
        return (TopologicalSortResult.CycleDetected) result;
    }
}
