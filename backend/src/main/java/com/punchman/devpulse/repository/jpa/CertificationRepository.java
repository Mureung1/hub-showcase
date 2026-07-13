package com.punchman.devpulse.repository.jpa;

import com.punchman.devpulse.domain.Certification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CertificationRepository extends JpaRepository<Certification, Long> {
}
