package com.punchman.devpulse.collector.dto;

public record CommitNode(
        String oid,
        String message,
        String committedDate,
        Integer additions,
        Integer deletions,
        CommitAuthor author
) {
}
