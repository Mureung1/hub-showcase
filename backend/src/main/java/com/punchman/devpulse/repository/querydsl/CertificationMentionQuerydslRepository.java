package com.punchman.devpulse.repository.querydsl;

import com.punchman.devpulse.domain.CertificationMention;
import java.util.List;

public interface CertificationMentionQuerydslRepository {

    List<CertificationMention> findByJobTitle(String jobTitle);
}
