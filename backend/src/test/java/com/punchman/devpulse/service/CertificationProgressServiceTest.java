package com.punchman.devpulse.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.CertificationProgress;
import com.punchman.devpulse.domain.ProgressStatus;
import com.punchman.devpulse.repository.jpa.CertificationProgressRepository;
import com.punchman.devpulse.repository.jpa.CertificationRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class CertificationProgressServiceTest {

    private final CertificationProgressRepository certificationProgressRepository =
            mock(CertificationProgressRepository.class);
    private final CertificationRepository certificationRepository = mock(CertificationRepository.class);
    private final CertificationProgressService service =
            new CertificationProgressService(certificationProgressRepository, certificationRepository);

    @Test
    void targetDateInThePastResolvesToOverdue() {
        assertThat(urgencyOf(ProgressStatus.PLANNED, LocalDate.now().minusDays(1))).isEqualTo(UrgencyLevel.OVERDUE);
    }

    @Test
    void targetDateWithinSevenDaysResolvesToImminent() {
        assertThat(urgencyOf(ProgressStatus.IN_PROGRESS, LocalDate.now().plusDays(7))).isEqualTo(UrgencyLevel.IMMINENT);
    }

    @Test
    void targetDateWithinThirtyDaysResolvesToUpcoming() {
        assertThat(urgencyOf(ProgressStatus.PLANNED, LocalDate.now().plusDays(30))).isEqualTo(UrgencyLevel.UPCOMING);
    }

    @Test
    void targetDateBeyondThirtyDaysResolvesToNone() {
        assertThat(urgencyOf(ProgressStatus.PLANNED, LocalDate.now().plusDays(31))).isEqualTo(UrgencyLevel.NONE);
    }

    @Test
    void missingTargetDateResolvesToNone() {
        assertThat(urgencyOf(ProgressStatus.PLANNED, null)).isEqualTo(UrgencyLevel.NONE);
    }

    @Test
    void completedStatusResolvesToNoneRegardlessOfTargetDate() {
        assertThat(urgencyOf(ProgressStatus.COMPLETED, LocalDate.now().minusDays(10))).isEqualTo(UrgencyLevel.NONE);
    }

    @Test
    void creatingProgressForUnknownCertificationThrows() {
        when(certificationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(99L, ProgressStatus.PLANNED, null, null))
                .isInstanceOf(CertificationNotFoundException.class);
    }

    @Test
    void creatingProgressForAlreadyTrackedCertificationThrows() {
        Certification certification = Certification.builder().id(1L).name("정보처리기사").build();
        CertificationProgress existing = CertificationProgress.builder()
                .id(1L)
                .certification(certification)
                .status(ProgressStatus.PLANNED)
                .build();
        when(certificationRepository.findById(1L)).thenReturn(Optional.of(certification));
        when(certificationProgressRepository.findByCertificationId(1L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.create(1L, ProgressStatus.PLANNED, null, null))
                .isInstanceOf(DuplicateCertificationProgressException.class);
    }

    private UrgencyLevel urgencyOf(ProgressStatus status, LocalDate targetDate) {
        Certification certification = Certification.builder().id(1L).name("정보처리기사").issuer("한국산업인력공단").build();
        CertificationProgress progress = CertificationProgress.builder()
                .id(1L)
                .certification(certification)
                .status(status)
                .targetDate(targetDate)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        when(certificationProgressRepository.search(any(), any(), any())).thenReturn(List.of(progress));

        return service.search(null, null, null).get(0).urgency();
    }
}
