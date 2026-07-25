package com.punchman.devpulse.repository.jpa;

import com.punchman.devpulse.domain.CertificationMention;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CertificationMentionRepository extends JpaRepository<CertificationMention, Long> {

    List<CertificationMention> findByJobTitle(String jobTitle);
}
