package com.punchman.devpulse.api;

import com.punchman.devpulse.domain.ProgressStatus;
import java.time.LocalDate;

public record CreateCertificationProgressRequest(
        Long certificationId,
        ProgressStatus status,
        LocalDate targetDate,
        String memo
) {
}
