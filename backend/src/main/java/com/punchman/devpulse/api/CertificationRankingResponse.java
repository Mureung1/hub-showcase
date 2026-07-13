package com.punchman.devpulse.api;

import com.punchman.devpulse.service.CertificationRankingResult;

public record CertificationRankingResponse(
        String certificationName,
        String issuer,
        int mentionCount,
        int totalPostingCount,
        double mentionRatePercent,
        String emphasis
) {

    public static CertificationRankingResponse from(CertificationRankingResult result) {
        double roundedPercent = Math.round(result.mentionRate() * 1000) / 10.0;
        return new CertificationRankingResponse(
                result.certificationName(),
                result.issuer(),
                result.mentionCount(),
                result.totalPostingCount(),
                roundedPercent,
                result.emphasis().name()
        );
    }
}
