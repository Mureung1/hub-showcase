package com.punchman.devpulse.api;

import com.punchman.devpulse.service.CertificationRankingResult;

public record CertificationRankingResponse(
        String certificationName,
        String issuer,
        int mentionCount,
        int totalPostingCount,
        double mentionRatePercent,
        String emphasis,
        int essentialMentionCount,
        int preferredMentionCount,
        int rank,
        double topRelativePercent,
        boolean llmAssisted
) {

    public static CertificationRankingResponse from(CertificationRankingResult result) {
        double roundedPercent = Math.round(result.mentionRate() * 1000) / 10.0;
        double roundedTopRelativePercent = Math.round(result.topRelativeRatio() * 1000) / 10.0;
        return new CertificationRankingResponse(
                result.certificationName(),
                result.issuer(),
                result.mentionCount(),
                result.totalPostingCount(),
                roundedPercent,
                result.emphasis().name(),
                result.essentialMentionCount(),
                result.preferredMentionCount(),
                result.rank(),
                roundedTopRelativePercent,
                result.llmAssisted()
        );
    }
}
