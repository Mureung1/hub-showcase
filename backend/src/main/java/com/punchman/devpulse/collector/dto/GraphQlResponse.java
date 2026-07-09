package com.punchman.devpulse.collector.dto;

import java.util.List;

public record GraphQlResponse(RepositorySyncData data, List<GraphQlError> errors) {
}
