package com.punchman.devpulse.repository.querydsl;

import static com.punchman.devpulse.domain.QCertificationMention.certificationMention;

import com.punchman.devpulse.domain.CertificationMention;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class CertificationMentionQuerydslRepositoryImpl implements CertificationMentionQuerydslRepository {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<CertificationMention> findByJobTitle(String jobTitle) {
        return queryFactory
                .selectFrom(certificationMention)
                .join(certificationMention.certification).fetchJoin()
                .where(certificationMention.jobTitle.eq(jobTitle))
                .fetch();
    }
}
