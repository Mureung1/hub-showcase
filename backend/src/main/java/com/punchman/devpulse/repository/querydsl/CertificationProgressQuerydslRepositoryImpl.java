package com.punchman.devpulse.repository.querydsl;

import static com.punchman.devpulse.domain.QCertificationProgress.certificationProgress;

import com.punchman.devpulse.domain.CertificationProgress;
import com.punchman.devpulse.domain.ProgressStatus;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class CertificationProgressQuerydslRepositoryImpl implements CertificationProgressQuerydslRepository {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<CertificationProgress> search(List<ProgressStatus> statuses, LocalDate from, LocalDate to) {
        BooleanBuilder where = new BooleanBuilder();
        if (statuses != null && !statuses.isEmpty()) {
            where.and(certificationProgress.status.in(statuses));
        }
        if (from != null) {
            where.and(certificationProgress.targetDate.goe(from));
        }
        if (to != null) {
            where.and(certificationProgress.targetDate.loe(to));
        }

        return queryFactory
                .selectFrom(certificationProgress)
                .join(certificationProgress.certification).fetchJoin()
                .where(where)
                .orderBy(certificationProgress.targetDate.asc().nullsLast())
                .fetch();
    }
}
