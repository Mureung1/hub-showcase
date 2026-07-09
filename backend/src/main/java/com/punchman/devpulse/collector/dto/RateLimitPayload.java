package com.punchman.devpulse.collector.dto;

public record RateLimitPayload(Integer remaining, String resetAt) {
}
