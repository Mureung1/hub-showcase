package com.punchman.devpulse.collector.dto;

import java.util.List;

public record CommitHistoryPayload(PageInfo pageInfo, List<CommitNode> nodes) {
}
