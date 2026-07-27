package com.punchman.devpulse.repository.jpa;

import com.punchman.devpulse.domain.CertificationLlmMatch;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CertificationLlmMatchRepository extends JpaRepository<CertificationLlmMatch, Long> {

    List<CertificationLlmMatch> findByJobPostingJobTitle(String jobTitle);

    boolean existsByJobPostingIdAndCertificationId(Long jobPostingId, Long certificationId);
}
