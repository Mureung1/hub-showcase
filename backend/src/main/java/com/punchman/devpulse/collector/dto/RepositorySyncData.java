package com.punchman.devpulse.collector.dto;

public record RepositorySyncData(RepositoryPayload repository, RateLimitPayload rateLimit) {
}
