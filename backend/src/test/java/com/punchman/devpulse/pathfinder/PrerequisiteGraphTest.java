package com.punchman.devpulse.pathfinder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;

class PrerequisiteGraphTest {

    private static final CertificationNode A = new CertificationNode(1L, "A");
    private static final CertificationNode B = new CertificationNode(2L, "B");

    @Test
    void selfReferencingEdgeIsRejected() {
        assertThatThrownBy(() -> PrerequisiteGraph.of(
                List.of(A),
                List.of(new PrerequisiteEdge(A.id(), A.id()))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void edgeReferencingUnknownNodeIsRejected() {
        assertThatThrownBy(() -> PrerequisiteGraph.of(
                List.of(A),
                List.of(new PrerequisiteEdge(A.id(), B.id()))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void duplicateEdgeIsDeduplicatedWithoutFalseCycle() {
        PrerequisiteGraph graph = PrerequisiteGraph.of(
                List.of(A, B),
                List.of(new PrerequisiteEdge(A.id(), B.id()), new PrerequisiteEdge(A.id(), B.id())));

        assertThat(graph.edges()).hasSize(1);

        TopologicalSortResult result = new TopologicalSorter().sort(graph);

        assertThat(result).isInstanceOf(TopologicalSortResult.Sorted.class);
        assertThat(((TopologicalSortResult.Sorted) result).order()).containsExactly(A, B);
    }
}
