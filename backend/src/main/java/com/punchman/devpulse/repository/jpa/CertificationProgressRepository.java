package com.punchman.devpulse.repository.jpa;

import com.punchman.devpulse.domain.CertificationProgress;
import com.punchman.devpulse.repository.querydsl.CertificationProgressQuerydslRepository;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CertificationProgressRepository
        extends JpaRepository<CertificationProgress, Long>, CertificationProgressQuerydslRepository {

    Optional<CertificationProgress> findByCertificationId(Long certificationId);
}
