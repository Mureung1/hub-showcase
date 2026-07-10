package com.punchman.devpulse.collector.dto;

import java.util.List;

public record IssueConnectionPayload(PageInfo pageInfo, List<IssueNode> nodes) {
}
