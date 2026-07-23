package com.punchman.devpulse.service;

import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.CertificationProgress;
import com.punchman.devpulse.domain.ProgressStatus;
import com.punchman.devpulse.repository.jpa.CertificationProgressRepository;
import com.punchman.devpulse.repository.jpa.CertificationRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CertificationProgressService {

    private static final long IMMINENT_DAYS = 7;
    private static final long UPCOMING_DAYS = 30;

    private final CertificationProgressRepository certificationProgressRepository;
    private final CertificationRepository certificationRepository;

    @Transactional(readOnly = true)
    public List<CertificationProgressResult> search(List<ProgressStatus> statuses, LocalDate from, LocalDate to) {
        return certificationProgressRepository.search(statuses, from, to).stream()
                .map(this::toResult)
                .toList();
    }

    @Transactional
    public CertificationProgressResult create(Long certificationId, ProgressStatus status, LocalDate targetDate,
            String memo) {
        Certification certification = certificationRepository.findById(certificationId)
                .orElseThrow(() -> new CertificationNotFoundException(certificationId));

        if (certificationProgressRepository.findByCertificationId(certificationId).isPresent()) {
            throw new DuplicateCertificationProgressException(certificationId);
        }

        LocalDateTime now = LocalDateTime.now();
        CertificationProgress progress = CertificationProgress.builder()
                .certification(certification)
                .status(status)
                .targetDate(targetDate)
                .memo(memo)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return toResult(certificationProgressRepository.save(progress));
    }

    @Transactional
    public CertificationProgressResult update(Long id, ProgressStatus status, LocalDate targetDate, String memo) {
        CertificationProgress progress = certificationProgressRepository.findById(id)
                .orElseThrow(() -> new CertificationProgressNotFoundException(id));

        progress.setStatus(status);
        progress.setTargetDate(targetDate);
        progress.setMemo(memo);
        progress.setUpdatedAt(LocalDateTime.now());

        return toResult(certificationProgressRepository.save(progress));
    }

    private CertificationProgressResult toResult(CertificationProgress progress) {
        return new CertificationProgressResult(
                progress.getId(),
                progress.getCertification().getId(),
                progress.getCertification().getName(),
                progress.getCertification().getIssuer(),
                progress.getStatus(),
                progress.getTargetDate(),
                resolveUrgency(progress.getStatus(), progress.getTargetDate()),
                progress.getMemo()
        );
    }

    private UrgencyLevel resolveUrgency(ProgressStatus status, LocalDate targetDate) {
        if (status == ProgressStatus.COMPLETED || targetDate == null) {
            return UrgencyLevel.NONE;
        }
        long daysUntil = ChronoUnit.DAYS.between(LocalDate.now(), targetDate);
        if (daysUntil < 0) {
            return UrgencyLevel.OVERDUE;
        }
        if (daysUntil <= IMMINENT_DAYS) {
            return UrgencyLevel.IMMINENT;
        }
        if (daysUntil <= UPCOMING_DAYS) {
            return UrgencyLevel.UPCOMING;
        }
        return UrgencyLevel.NONE;
    }
}
