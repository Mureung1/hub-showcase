package com.punchman.devpulse.service;

import com.punchman.devpulse.domain.ProgressStatus;
import java.time.LocalDate;

public record CertificationProgressResult(
        Long id,
        Long certificationId,
        String certificationName,
        String issuer,
        ProgressStatus status,
        LocalDate targetDate,
        UrgencyLevel urgency,
        String memo
) {
}
