package com.punchman.devpulse.repository.querydsl;

import static org.assertj.core.api.Assertions.assertThat;

import com.punchman.devpulse.bootstrap.DevpulseApplication;
import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.CertificationProgress;
import com.punchman.devpulse.domain.ProgressStatus;
import com.punchman.devpulse.repository.jpa.CertificationProgressRepository;
import com.punchman.devpulse.repository.jpa.CertificationRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * V2__seed.sql로 시드된 certification 데이터를 전제로 하는 통합 테스트 (자격증 7종 중 2개만 사용).
 * 로컬 docker-compose Postgres(포트 5433)가 기동돼 있어야 통과한다.
 * bootstrap 패키지가 상위 패키지가 아니라서 @SpringBootTest에 classes를 명시한다.
 */
@SpringBootTest(classes = DevpulseApplication.class)
class CertificationProgressQuerydslRepositoryTest {

    @Autowired
    private CertificationProgressRepository progressRepository;

    @Autowired
    private CertificationRepository certificationRepository;

    @AfterEach
    void cleanUp() {
        progressRepository.deleteAll();
    }

    @Test
    void searchWithNoFilterReturnsAllRows() {
        List<Certification> certifications = certificationRepository.findAll();
        save(certifications.get(0), ProgressStatus.PLANNED, LocalDate.now().plusDays(5));
        save(certifications.get(1), ProgressStatus.COMPLETED, null);

        List<CertificationProgress> result = progressRepository.search(null, null, null);

        assertThat(result).hasSize(2);
    }

    @Test
    void searchByStatusFiltersCorrectly() {
        List<Certification> certifications = certificationRepository.findAll();
        save(certifications.get(0), ProgressStatus.PLANNED, LocalDate.now().plusDays(5));
        save(certifications.get(1), ProgressStatus.COMPLETED, null);

        List<CertificationProgress> result =
                progressRepository.search(List.of(ProgressStatus.COMPLETED), null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(ProgressStatus.COMPLETED);
    }

    @Test
    void searchByDateRangeFiltersCorrectly() {
        List<Certification> certifications = certificationRepository.findAll();
        save(certifications.get(0), ProgressStatus.PLANNED, LocalDate.now().plusDays(5));
        save(certifications.get(1), ProgressStatus.PLANNED, LocalDate.now().plusDays(60));

        List<CertificationProgress> result =
                progressRepository.search(null, LocalDate.now(), LocalDate.now().plusDays(10));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTargetDate()).isEqualTo(LocalDate.now().plusDays(5));
    }

    private void save(Certification certification, ProgressStatus status, LocalDate targetDate) {
        LocalDateTime now = LocalDateTime.now();
        progressRepository.save(CertificationProgress.builder()
                .certification(certification)
                .status(status)
                .targetDate(targetDate)
                .createdAt(now)
                .updatedAt(now)
                .build());
    }
}
