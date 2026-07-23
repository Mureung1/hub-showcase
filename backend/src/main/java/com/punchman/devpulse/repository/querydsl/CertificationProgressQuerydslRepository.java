package com.punchman.devpulse.repository.querydsl;

import com.punchman.devpulse.domain.CertificationProgress;
import com.punchman.devpulse.domain.ProgressStatus;
import java.time.LocalDate;
import java.util.List;

public interface CertificationProgressQuerydslRepository {

    List<CertificationProgress> search(List<ProgressStatus> statuses, LocalDate from, LocalDate to);
}
