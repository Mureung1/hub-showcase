package com.punchman.devpulse.service;

public record CertificationRankingResult(
        String certificationName,
        String issuer,
        int mentionCount,
        int totalPostingCount,
        double mentionRate,
        EmphasisLevel emphasis,
        int essentialMentionCount,
        int preferredMentionCount,
        int rank,
        double topRelativeRatio,
        boolean llmAssisted
) {
}
