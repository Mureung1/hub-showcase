package com.punchman.devpulse.api;

import com.punchman.devpulse.pathfinder.CertificationNode;
import com.punchman.devpulse.pathfinder.TopologicalSortResult;
import java.util.List;

public record CertificationPathResponse(
        List<CertificationNode> order, List<CertificationNode> stuckCertifications, boolean hasCycle) {

    public static CertificationPathResponse from(TopologicalSortResult result) {
        if (result instanceof TopologicalSortResult.Sorted sorted) {
            return new CertificationPathResponse(sorted.order(), List.of(), false);
        }
        TopologicalSortResult.CycleDetected cycle = (TopologicalSortResult.CycleDetected) result;
        return new CertificationPathResponse(List.of(), cycle.stuckNodes(), true);
    }
}
