package com.punchman.devpulse.pathfinder;

/**
 * prerequisiteId 자격증은 certificationId 자격증보다 먼저 취득해야 한다.
 */
public record PrerequisiteEdge(Long prerequisiteId, Long certificationId) {
}
