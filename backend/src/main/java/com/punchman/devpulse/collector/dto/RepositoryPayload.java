package com.punchman.devpulse.collector.dto;

public record RepositoryPayload(DefaultBranchRefPayload defaultBranchRef, IssueConnectionPayload issues) {
}
