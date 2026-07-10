package com.punchman.devpulse.collector.dto;

import java.util.Map;

public record GraphQlRequest(String query, Map<String, Object> variables) {
}
