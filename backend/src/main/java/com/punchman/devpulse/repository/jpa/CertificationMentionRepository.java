package com.punchman.devpulse.repository.jpa;

import com.punchman.devpulse.domain.CertificationMention;
import com.punchman.devpulse.repository.querydsl.CertificationMentionQuerydslRepository;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CertificationMentionRepository
        extends JpaRepository<CertificationMention, Long>, CertificationMentionQuerydslRepository {
}
