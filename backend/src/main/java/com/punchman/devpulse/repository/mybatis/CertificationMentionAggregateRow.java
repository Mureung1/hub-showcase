package com.punchman.devpulse.repository.mybatis;

public record CertificationMentionAggregateRow(
        String certificationName,
        String issuer,
        int mentionCount,
        int totalPostingCount,
        double mentionRate,
        int essentialMentionCount,
        int preferredMentionCount
) {
}
