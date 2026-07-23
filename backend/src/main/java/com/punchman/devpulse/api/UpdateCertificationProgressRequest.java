package com.punchman.devpulse.api;

import com.punchman.devpulse.domain.ProgressStatus;
import java.time.LocalDate;

public record UpdateCertificationProgressRequest(
        ProgressStatus status,
        LocalDate targetDate,
        String memo
) {
}
