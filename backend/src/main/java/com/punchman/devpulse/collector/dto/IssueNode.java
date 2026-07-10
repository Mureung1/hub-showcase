package com.punchman.devpulse.collector.dto;

public record IssueNode(
        Integer number,
        String title,
        String state,
        String createdAt,
        String updatedAt,
        String closedAt,
        LabelConnectionPayload labels
) {
}
