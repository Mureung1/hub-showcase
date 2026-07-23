package com.punchman.devpulse.api;

import com.punchman.devpulse.service.CertificationProgressResult;
import java.time.LocalDate;

public record CertificationProgressResponse(
        Long id,
        Long certificationId,
        String certificationName,
        String issuer,
        String status,
        LocalDate targetDate,
        String urgency,
        String memo
) {

    public static CertificationProgressResponse from(CertificationProgressResult result) {
        return new CertificationProgressResponse(
                result.id(),
                result.certificationId(),
                result.certificationName(),
                result.issuer(),
                result.status().name(),
                result.targetDate(),
                result.urgency().name(),
                result.memo()
        );
    }
}
